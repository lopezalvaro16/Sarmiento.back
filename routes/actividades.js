const express = require('express');
const router = express.Router();
const pool = require('../db_sqlite');

// GET - Obtener todas las actividades con filtros
router.get('/', async (req, res) => {
  const { estado, buscar } = req.query;
  let query = 'SELECT * FROM actividades WHERE 1=1';
  const params = [];

  if (estado && estado !== 'todas') {
    params.push(estado);
    query += ` AND estado = ?`;
  }

  if (buscar) {
    params.push(`%${buscar}%`);
    params.push(`%${buscar}%`);
    params.push(`%${buscar}%`);
    query += ` AND (nombre LIKE ? OR descripcion LIKE ? OR instructor LIKE ?)`;
  }

  query += ' ORDER BY nombre';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows || result);
  } catch (err) {
    console.error('Error al obtener actividades:', err);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

// POST - Crear nueva actividad
router.post('/', async (req, res) => {
  const { nombre, descripcion, instructor, horario, dias_semana, cupo_maximo, precio, fecha_inicio, fecha_fin } = req.body;
  
  if (!nombre || !instructor || !horario || !dias_semana) {
    return res.status(400).json({ error: 'Nombre, instructor, horario y días de semana son obligatorios' });
  }

  try {
    await pool.query(
      `INSERT INTO actividades (nombre, descripcion, instructor, horario, dias_semana, cupo_maximo, precio, fecha_inicio, fecha_fin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, instructor, horario, dias_semana, cupo_maximo, precio, fecha_inicio, fecha_fin]
    );
    
    // Obtener el registro recién creado
    const result = await pool.query(
      'SELECT * FROM actividades ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json((result.rows || result)[0]);
  } catch (err) {
    console.error('Error al crear actividad:', err);
    res.status(500).json({ error: 'Error al crear actividad' });
  }
});

// PUT - Actualizar actividad
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, instructor, horario, dias_semana, cupo_maximo, precio, estado, fecha_inicio, fecha_fin } = req.body;

  try {
    await pool.query(
      `UPDATE actividades SET 
         nombre = COALESCE(?, nombre),
         descripcion = COALESCE(?, descripcion),
         instructor = COALESCE(?, instructor),
         horario = COALESCE(?, horario),
         dias_semana = COALESCE(?, dias_semana),
         cupo_maximo = COALESCE(?, cupo_maximo),
         precio = COALESCE(?, precio),
         estado = COALESCE(?, estado),
         fecha_inicio = COALESCE(?, fecha_inicio),
         fecha_fin = COALESCE(?, fecha_fin)
       WHERE id = ?`,
      [nombre, descripcion, instructor, horario, dias_semana, cupo_maximo, precio, estado, fecha_inicio, fecha_fin, id]
    );
    
    // Obtener el registro actualizado
    const result = await pool.query(
      'SELECT * FROM actividades WHERE id = ?',
      [id]
    );
    const data = result.rows || result;
    if (data.length === 0) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json(data[0]);
  } catch (err) {
    console.error('Error al actualizar actividad:', err);
    res.status(500).json({ error: 'Error al actualizar actividad' });
  }
});

// DELETE - Eliminar actividad
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si la actividad tiene inscripciones activas
    const inscripciones = await pool.query(
      'SELECT COUNT(*) as count FROM inscripciones WHERE actividad_id = ? AND estado = "activa"',
      [id]
    );
    
    if ((inscripciones.rows || inscripciones)[0].count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una actividad con inscripciones activas' });
    }

    const result = await pool.query('DELETE FROM actividades WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Actividad no encontrada' });
    res.json({ message: 'Actividad eliminada con éxito' });
  } catch (err) {
    console.error('Error al eliminar actividad:', err);
    res.status(500).json({ error: 'Error al eliminar actividad' });
  }
});

module.exports = router;
