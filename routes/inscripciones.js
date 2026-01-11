const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET - Obtener todas las inscripciones con información de socios y actividades
router.get('/', async (req, res) => {
  const { estado, actividad_id, socio_id } = req.query;
  let query = `
    SELECT 
      i.*,
      s.numero_socio,
      s.nombre as socio_nombre,
      s.apellido as socio_apellido,
      a.nombre as actividad_nombre,
      a.instructor,
      a.horario,
      a.dias_semana,
      a.precio
    FROM inscripciones i
    JOIN socios s ON i.socio_id = s.id
    JOIN actividades a ON i.actividad_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (estado && estado !== 'todas') {
    params.push(estado);
    query += ` AND i.estado = ?`;
  }

  if (actividad_id) {
    params.push(actividad_id);
    query += ` AND i.actividad_id = ?`;
  }

  if (socio_id) {
    params.push(socio_id);
    query += ` AND i.socio_id = ?`;
  }

  query += ' ORDER BY i.fecha_inscripcion DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows || result);
  } catch (err) {
    console.error('Error al obtener inscripciones:', err);
    res.status(500).json({ error: 'Error al obtener inscripciones' });
  }
});

// GET - Obtener cupos disponibles por actividad
router.get('/cupos/:actividad_id', async (req, res) => {
  const { actividad_id } = req.params;

  try {
    const actividadQuery = await pool.query(
      'SELECT cupo_maximo FROM actividades WHERE id = ?',
      [actividad_id]
    );
    
    const actividad = (actividadQuery.rows || actividadQuery)[0];
    if (!actividad) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }

    const inscripcionesQuery = await pool.query(
      'SELECT COUNT(*) as inscriptos FROM inscripciones WHERE actividad_id = ? AND estado = "activa"',
      [actividad_id]
    );
    
    const inscriptos = (inscripcionesQuery.rows || inscripcionesQuery)[0].inscriptos;
    const disponibles = actividad.cupo_maximo - inscriptos;

    res.json({
      cupo_maximo: actividad.cupo_maximo,
      inscriptos: inscriptos,
      disponibles: disponibles
    });
  } catch (err) {
    console.error('Error al obtener cupos:', err);
    res.status(500).json({ error: 'Error al obtener cupos' });
  }
});

// POST - Crear nueva inscripción
router.post('/', async (req, res) => {
  const { socio_id, actividad_id, observaciones } = req.body;
  
  if (!socio_id || !actividad_id) {
    return res.status(400).json({ error: 'Socio y actividad son obligatorios' });
  }

  try {
    // Verificar que el socio existe y está activo
    const socio = await pool.query(
      'SELECT id, estado FROM socios WHERE id = ?',
      [socio_id]
    );
    
    if ((socio.rows || socio).length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }
    
    if ((socio.rows || socio)[0].estado !== 'activo') {
      return res.status(400).json({ error: 'El socio no está activo' });
    }

    // Verificar que la actividad existe y está activa
    const actividad = await pool.query(
      'SELECT id, estado, cupo_maximo FROM actividades WHERE id = ?',
      [actividad_id]
    );
    
    if ((actividad.rows || actividad).length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' });
    }
    
    if ((actividad.rows || actividad)[0].estado !== 'activa') {
      return res.status(400).json({ error: 'La actividad no está activa' });
    }

    // Verificar que no esté ya inscripto
    const existente = await pool.query(
      'SELECT id FROM inscripciones WHERE socio_id = ? AND actividad_id = ? AND estado = "activa"',
      [socio_id, actividad_id]
    );
    
    if ((existente.rows || existente).length > 0) {
      return res.status(400).json({ error: 'El socio ya está inscripto en esta actividad' });
    }

    // Verificar cupo disponible
    const inscriptos = await pool.query(
      'SELECT COUNT(*) as count FROM inscripciones WHERE actividad_id = ? AND estado = "activa"',
      [actividad_id]
    );
    
    const cupoOcupado = (inscriptos.rows || inscriptos)[0].count;
    const cupoMaximo = (actividad.rows || actividad)[0].cupo_maximo;
    
    if (cupoOcupado >= cupoMaximo) {
      return res.status(400).json({ error: 'No hay cupos disponibles para esta actividad' });
    }

    await pool.query(
      `INSERT INTO inscripciones (socio_id, actividad_id, observaciones)
       VALUES (?, ?, ?)`,
      [socio_id, actividad_id, observaciones]
    );
    
    // Obtener el registro recién creado con información completa
    const result = await pool.query(`
      SELECT 
        i.*,
        s.numero_socio,
        s.nombre as socio_nombre,
        s.apellido as socio_apellido,
        a.nombre as actividad_nombre,
        a.instructor,
        a.horario,
        a.dias_semana,
        a.precio
      FROM inscripciones i
      JOIN socios s ON i.socio_id = s.id
      JOIN actividades a ON i.actividad_id = a.id
      ORDER BY i.id DESC LIMIT 1
    `);
    
    res.status(201).json((result.rows || result)[0]);
  } catch (err) {
    console.error('Error al crear inscripción:', err);
    res.status(500).json({ error: 'Error al crear inscripción' });
  }
});

// PUT - Actualizar inscripción (cambiar estado principalmente)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, fecha_baja, observaciones } = req.body;

  try {
    await pool.query(
      `UPDATE inscripciones SET 
         estado = COALESCE(?, estado),
         fecha_baja = COALESCE(?, fecha_baja),
         observaciones = COALESCE(?, observaciones)
       WHERE id = ?`,
      [estado, fecha_baja, observaciones, id]
    );
    
    // Obtener el registro actualizado con información completa
    const result = await pool.query(`
      SELECT 
        i.*,
        s.numero_socio,
        s.nombre as socio_nombre,
        s.apellido as socio_apellido,
        a.nombre as actividad_nombre,
        a.instructor,
        a.horario,
        a.dias_semana,
        a.precio
      FROM inscripciones i
      JOIN socios s ON i.socio_id = s.id
      JOIN actividades a ON i.actividad_id = a.id
      WHERE i.id = ?
    `, [id]);
    
    const data = result.rows || result;
    if (data.length === 0) return res.status(404).json({ error: 'Inscripción no encontrada' });
    res.json(data[0]);
  } catch (err) {
    console.error('Error al actualizar inscripción:', err);
    res.status(500).json({ error: 'Error al actualizar inscripción' });
  }
});

// DELETE - Eliminar inscripción
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM inscripciones WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Inscripción no encontrada' });
    res.json({ message: 'Inscripción eliminada con éxito' });
  } catch (err) {
    console.error('Error al eliminar inscripción:', err);
    res.status(500).json({ error: 'Error al eliminar inscripción' });
  }
});

module.exports = router;
