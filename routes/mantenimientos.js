const express = require('express');
const router = express.Router();
const pool = require('../db_sqlite');

// Listar tareas (opcional: filtrar por cancha o estado)
router.get('/', async (req, res) => {
  const { cancha, estado } = req.query;
  let query = 'SELECT * FROM mantenimientos';
  const params = [];
  if (cancha) {
    params.push(cancha);
    query += ` WHERE cancha = ?`;
  }
  if (estado) {
    params.push(estado);
    query += params.length === 1 ? ` WHERE estado = ?` : ` AND estado = ?`;
  }
  query += ' ORDER BY fecha DESC, id DESC';
  try {
    const result = await pool.query(query, params);
    res.json(result.rows || result);
  } catch (err) {
    console.error('Error al obtener mantenimientos:', err);
    res.status(500).json({ error: 'Error al obtener mantenimientos' });
  }
});

// Crear nueva tarea
router.post('/', async (req, res) => {
  const { fecha, descripcion, estado, responsable, cancha } = req.body;
  if (!fecha || !descripcion || !cancha) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    await pool.query(
      `INSERT INTO mantenimientos (fecha, descripcion, estado, responsable, cancha)
       VALUES (?, ?, ?, ?, ?)`,
      [fecha, descripcion, estado || 'pendiente', responsable, cancha]
    );
    
    // Obtener el registro recién creado
    const result = await pool.query(
      'SELECT * FROM mantenimientos ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json((result.rows || result)[0]);
  } catch (err) {
    console.error('Error al crear mantenimiento:', err);
    res.status(500).json({ error: 'Error al crear mantenimiento' });
  }
});

// Actualizar tarea (estado o datos)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { fecha, descripcion, estado, responsable, cancha } = req.body;
  try {
    await pool.query(
      `UPDATE mantenimientos SET
         fecha = COALESCE(?, fecha),
         descripcion = COALESCE(?, descripcion),
         estado = COALESCE(?, estado),
         responsable = COALESCE(?, responsable),
         cancha = COALESCE(?, cancha)
       WHERE id = ?`,
      [fecha, descripcion, estado, responsable, cancha, id]
    );
    
    // Obtener el registro actualizado
    const result = await pool.query(
      'SELECT * FROM mantenimientos WHERE id = ?',
      [id]
    );
    const data = result.rows || result;
    if (data.length === 0) return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    res.json(data[0]);
  } catch (err) {
    console.error('Error al actualizar mantenimiento:', err);
    res.status(500).json({ error: 'Error al actualizar mantenimiento' });
  }
});

module.exports = router; 