const express = require('express');
const router = express.Router();
const db = require('../db_sqlite');

// Obtener todos los establecimientos
router.get('/', async (req, res) => {
  try {
    const establecimientos = await db.query('SELECT * FROM establecimientos ORDER BY nombre');
    res.json(establecimientos.rows);
  } catch (error) {
    console.error('Error al obtener establecimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un establecimiento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const establecimiento = await db.query('SELECT * FROM establecimientos WHERE id = $1', [id]);
    
    if (establecimiento.rows.length === 0) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }
    
    res.json(establecimiento.rows[0]);
  } catch (error) {
    console.error('Error al obtener establecimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear un nuevo establecimiento
router.post('/', async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del establecimiento es obligatorio' });
    }
    
    // Verificar si ya existe un establecimiento con el mismo nombre
    const existe = await db.query('SELECT id FROM establecimientos WHERE LOWER(nombre) = LOWER($1)', [nombre.trim()]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un establecimiento con ese nombre' });
    }
    
    const nuevoEstablecimiento = await db.query(
      'INSERT INTO establecimientos (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), descripcion?.trim() || null]
    );
    
    res.status(201).json(nuevoEstablecimiento.rows[0]);
  } catch (error) {
    console.error('Error al crear establecimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar un establecimiento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre del establecimiento es obligatorio' });
    }
    
    // Verificar si el establecimiento existe
    const existe = await db.query('SELECT id FROM establecimientos WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }
    
    // Verificar si ya existe otro establecimiento con el mismo nombre
    const nombreExiste = await db.query('SELECT id FROM establecimientos WHERE LOWER(nombre) = LOWER($1) AND id != $2', [nombre.trim(), id]);
    if (nombreExiste.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro establecimiento con ese nombre' });
    }
    
    const establecimientoActualizado = await db.query(
      'UPDATE establecimientos SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *',
      [nombre.trim(), descripcion?.trim() || null, id]
    );
    
    res.json(establecimientoActualizado.rows[0]);
  } catch (error) {
    console.error('Error al actualizar establecimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar un establecimiento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el establecimiento existe
    const existe = await db.query('SELECT id FROM establecimientos WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Establecimiento no encontrado' });
    }
    
    // Verificar si hay reservas asociadas a este establecimiento
    const reservasAsociadas = await db.query('SELECT id FROM reservas WHERE cancha = (SELECT nombre FROM establecimientos WHERE id = $1)', [id]);
    if (reservasAsociadas.rows.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar el establecimiento porque tiene reservas asociadas' });
    }
    
    await db.query('DELETE FROM establecimientos WHERE id = $1', [id]);
    
    res.json({ message: 'Establecimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar establecimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
