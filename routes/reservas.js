const express = require('express');
const router = express.Router();
const pool = require('../db');

console.log('Router de reservas cargado');

// Offset de zona horaria para interpretar las horas recibidas (por defecto -03:00 Buenos Aires)
// Podés configurar TZ_OFFSET="-03:00" en el entorno del servidor si fuese distinto
const TZ_OFFSET = process.env.TZ_OFFSET || '-03:00';

function buildZonedDate(fecha, horaHHMM) {
  // Convierte "YYYY-MM-DD" + "HH:MM" a un Date con offset explícito
  // Ej: 2025-09-24 + 17:00 -> 2025-09-24T17:00:00-03:00
  return new Date(`${fecha}T${horaHHMM}:00${TZ_OFFSET}`);
}

// Endpoint de prueba
router.get('/test', (req, res) => {
  res.json({ ok: true, msg: 'Funciona el router de reservas' });
});

// Obtener todas las reservas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reservas ORDER BY fecha, hora_desde');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener reservas' });
  }
});

// Crear una nueva reserva
router.post('/', async (req, res) => {
  const { fecha, hora_desde, hora_hasta, cancha, socio, estado } = req.body;
  if (!fecha || !hora_desde || !hora_hasta || !cancha || !socio) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  // Validar horarios - permitir cruzar medianoche
  if (hora_hasta === hora_desde) {
    return res.status(400).json({ error: 'La hora de fin debe ser diferente a la de inicio' });
  }
  // Si hora_hasta <= hora_desde, significa que cruza medianoche (ej: 23:00 a 04:00) - esto es válido
  // Validar fecha/hora pasada interpretando la hora recibida con el offset configurado
  const now = new Date();
  const startDateTime = buildZonedDate(fecha, hora_desde);
  if (isNaN(startDateTime.getTime())) {
    return res.status(400).json({ error: 'Formato de fecha u hora inválido' });
  }
  if (startDateTime <= now) {
    return res.status(400).json({ error: 'No se puede reservar en el pasado.' });
  }
  // Validar superposición - manejar horarios que cruzan medianoche
  try {
    // Obtener todas las reservas existentes para la misma fecha y establecimiento
    const reservasExistentes = await pool.query(
      `SELECT hora_desde, hora_hasta FROM reservas
       WHERE fecha = $1 AND cancha = $2`,
      [fecha, cancha]
    );
    
    // Verificar superposición con cada reserva existente
    const haySuperposicion = reservasExistentes.rows.some(r => {
      const rHoraDesde = r.hora_desde;
      const rHoraHasta = r.hora_hasta;
      const nHoraDesde = hora_desde;
      const nHoraHasta = hora_hasta;
      
      // Si la reserva existente cruza medianoche
      if (rHoraHasta <= rHoraDesde) {
        // Si la nueva reserva también cruza medianoche
        if (nHoraHasta <= nHoraDesde) {
          // Ambas cruzan medianoche - siempre hay superposición
          return true;
        } else {
          // Solo la existente cruza medianoche
          // La nueva reserva se superpone si está en el rango de medianoche
          return nHoraDesde >= rHoraDesde || nHoraHasta <= rHoraHasta;
        }
      } else {
        // La reserva existente no cruza medianoche
        if (nHoraHasta <= nHoraDesde) {
          // Solo la nueva cruza medianoche
          // Se superpone si la existente está en el rango de medianoche
          return rHoraDesde >= nHoraDesde || rHoraHasta <= nHoraHasta;
        } else {
          // Ninguna cruza medianoche - comparación normal
          return nHoraDesde < rHoraHasta && nHoraHasta > rHoraDesde;
        }
      }
    });
    
    if (haySuperposicion) {
      return res.status(400).json({ error: 'Ya existe una reserva superpuesta para ese establecimiento, fecha y horario' });
    }
    const result = await pool.query(
      `INSERT INTO reservas (fecha, hora_desde, hora_hasta, cancha, socio, estado)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [fecha, hora_desde, hora_hasta, cancha, socio, estado || 'Pendiente']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear reserva:', err);
    res.status(500).json({ error: 'Error al crear reserva' });
  }
});

// Eliminar una reserva
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar reserva' });
  }
});

// Editar una reserva
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fecha, hora_desde, hora_hasta, cancha, socio, estado } = req.body;
  if (!fecha || !hora_desde || !hora_hasta || !cancha || !socio) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  // Validar horarios - permitir cruzar medianoche
  if (hora_hasta === hora_desde) {
    return res.status(400).json({ error: 'La hora de fin debe ser diferente a la de inicio' });
  }
  // Si hora_hasta <= hora_desde, significa que cruza medianoche (ej: 23:00 a 04:00) - esto es válido
  // Validar fecha/hora pasada (en editar) con offset configurado
  const now2 = new Date();
  const startDateTime2 = buildZonedDate(fecha, hora_desde);
  if (isNaN(startDateTime2.getTime())) {
    return res.status(400).json({ error: 'Formato de fecha u hora inválido' });
  }
  if (startDateTime2 <= now2) {
    return res.status(400).json({ error: 'No se puede reservar en el pasado.' });
  }
  // Validar superposición - manejar horarios que cruzan medianoche (excluyendo la reserva actual)
  try {
    // Obtener todas las reservas existentes para la misma fecha y establecimiento (excluyendo la actual)
    const reservasExistentes = await pool.query(
      `SELECT hora_desde, hora_hasta FROM reservas
       WHERE fecha = $1 AND cancha = $2 AND id <> $3`,
      [fecha, cancha, id]
    );
    
    // Verificar superposición con cada reserva existente
    const haySuperposicion = reservasExistentes.rows.some(r => {
      const rHoraDesde = r.hora_desde;
      const rHoraHasta = r.hora_hasta;
      const nHoraDesde = hora_desde;
      const nHoraHasta = hora_hasta;
      
      // Si la reserva existente cruza medianoche
      if (rHoraHasta <= rHoraDesde) {
        // Si la nueva reserva también cruza medianoche
        if (nHoraHasta <= nHoraDesde) {
          // Ambas cruzan medianoche - siempre hay superposición
          return true;
        } else {
          // Solo la existente cruza medianoche
          // La nueva reserva se superpone si está en el rango de medianoche
          return nHoraDesde >= rHoraDesde || nHoraHasta <= rHoraHasta;
        }
      } else {
        // La reserva existente no cruza medianoche
        if (nHoraHasta <= nHoraDesde) {
          // Solo la nueva cruza medianoche
          // Se superpone si la existente está en el rango de medianoche
          return rHoraDesde >= nHoraDesde || rHoraHasta <= nHoraHasta;
        } else {
          // Ninguna cruza medianoche - comparación normal
          return nHoraDesde < rHoraHasta && nHoraHasta > rHoraDesde;
        }
      }
    });
    
    if (haySuperposicion) {
      return res.status(400).json({ error: 'Ya existe una reserva superpuesta para ese establecimiento, fecha y horario' });
    }
    const result = await pool.query(
      `UPDATE reservas SET fecha = $1, hora_desde = $2, hora_hasta = $3, cancha = $4, socio = $5, estado = $6 WHERE id = $7`,
      [fecha, hora_desde, hora_hasta, cancha, socio, estado || 'Pendiente', id]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    
    // Obtener la reserva actualizada
    const reservaActualizada = await pool.query(
      'SELECT * FROM reservas WHERE id = $1',
      [id]
    );
    
    res.json(reservaActualizada.rows[0]);
  } catch (err) {
    console.error('Error al editar reserva:', err);
    res.status(500).json({ error: 'Error al editar reserva' });
  }
});

module.exports = router; 