const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar tareas (opcional: filtrar por cancha o estado)
router.get('/', async (req, res) => {
  const { cancha, estado } = req.query;
  let query = 'SELECT * FROM mantenimientos';
  const params = [];
  if (cancha) {
    params.push(cancha);
    query += ` WHERE cancha = $${params.length}`;
  }
  if (estado) {
    params.push(estado);
    query += params.length === 1 ? ` WHERE estado = $${params.length}` : ` AND estado = $${params.length}`;
  }
  query += ' ORDER BY fecha DESC, id DESC';
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
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
    const result = await pool.query(
      `INSERT INTO mantenimientos (fecha, descripcion, estado, responsable, cancha)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fecha, descripcion, estado || 'pendiente', responsable, cancha]
    );
    res.status(201).json(result.rows[0]);
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
    const result = await pool.query(
      `UPDATE mantenimientos SET
         fecha = COALESCE($1, fecha),
         descripcion = COALESCE($2, descripcion),
         estado = COALESCE($3, estado),
         responsable = COALESCE($4, responsable),
         cancha = COALESCE($5, cancha)
       WHERE id = $6 RETURNING *`,
      [fecha, descripcion, estado, responsable, cancha, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mantenimiento no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al actualizar mantenimiento:', err);
    res.status(500).json({ error: 'Error al actualizar mantenimiento' });
  }
});

module.exports = router; 