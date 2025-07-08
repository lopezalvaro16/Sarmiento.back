const express = require('express');
const router = express.Router();
const pool = require('../db');

console.log('Router de reservas cargado');

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
  if (hora_hasta <= hora_desde) {
    return res.status(400).json({ error: 'La hora de fin debe ser mayor a la de inicio' });
  }
  // Validar fecha/hora pasada
  const now = new Date();
  const hoyStr = now.toISOString().slice(0,10);
  if (fecha < hoyStr || (fecha === hoyStr && hora_desde <= now.toTimeString().slice(0,5))) {
    return res.status(400).json({ error: 'No se puede reservar en el pasado.' });
  }
  // Validar superposición
  try {
    const existe = await pool.query(
      `SELECT 1 FROM reservas
       WHERE fecha = $1 AND cancha = $2
         AND (hora_desde < $4 AND hora_hasta > $3)`,
      [fecha, cancha, hora_desde, hora_hasta]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe una reserva superpuesta para esa cancha, fecha y horario' });
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
  if (hora_hasta <= hora_desde) {
    return res.status(400).json({ error: 'La hora de fin debe ser mayor a la de inicio' });
  }
  // Validar fecha/hora pasada (en editar)
  const now2 = new Date();
  const hoyStr2 = now2.toISOString().slice(0,10);
  if (fecha < hoyStr2 || (fecha === hoyStr2 && hora_desde <= now2.toTimeString().slice(0,5))) {
    return res.status(400).json({ error: 'No se puede reservar en el pasado.' });
  }
  // Validar superposición (excluyendo la reserva actual)
  try {
    const existe = await pool.query(
      `SELECT 1 FROM reservas
       WHERE fecha = $1 AND cancha = $2
         AND (hora_desde < $4 AND hora_hasta > $3)
         AND id <> $5`,
      [fecha, cancha, hora_desde, hora_hasta, id]
    );
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe una reserva superpuesta para esa cancha, fecha y horario' });
    }
    const result = await pool.query(
      `UPDATE reservas SET fecha = $1, hora_desde = $2, hora_hasta = $3, cancha = $4, socio = $5, estado = $6 WHERE id = $7 RETURNING *`,
      [fecha, hora_desde, hora_hasta, cancha, socio, estado || 'Pendiente', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al editar reserva:', err);
    res.status(500).json({ error: 'Error al editar reserva' });
  }
});

module.exports = router; 