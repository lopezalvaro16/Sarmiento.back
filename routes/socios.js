const express = require('express');
const router = express.Router();
const pool = require('../db_sqlite');

// GET - Obtener todos los socios con filtros
router.get('/', async (req, res) => {
  const { estado, buscar } = req.query;
  let query = 'SELECT * FROM socios WHERE 1=1';
  const params = [];

  if (estado && estado !== 'todos') {
    params.push(estado);
    query += ` AND estado = ?`;
  }

  if (buscar) {
    params.push(`%${buscar}%`);
    params.push(`%${buscar}%`);
    params.push(`%${buscar}%`);
    query += ` AND (nombre LIKE ? OR apellido LIKE ? OR dni LIKE ?)`;
  }

  query += ' ORDER BY apellido, nombre';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows || result);
  } catch (err) {
    console.error('Error al obtener socios:', err);
    res.status(500).json({ error: 'Error al obtener socios' });
  }
});

// POST - Crear nuevo socio
router.post('/', async (req, res) => {
  const { numero_socio, nombre, apellido, dni, telefono, email, fecha_nacimiento, direccion, observaciones } = req.body;
  
  if (!numero_socio || !nombre || !apellido || !dni) {
    return res.status(400).json({ error: 'Número de socio, nombre, apellido y DNI son obligatorios' });
  }

  try {
    // Verificar si ya existe el número de socio o DNI
    const existente = await pool.query(
      'SELECT id FROM socios WHERE numero_socio = ? OR dni = ?',
      [numero_socio, dni]
    );
    
    if ((existente.rows || existente).length > 0) {
      return res.status(400).json({ error: 'Ya existe un socio con ese número o DNI' });
    }

    await pool.query(
      `INSERT INTO socios (numero_socio, nombre, apellido, dni, telefono, email, fecha_nacimiento, direccion, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero_socio, nombre, apellido, dni, telefono, email, fecha_nacimiento, direccion, observaciones]
    );
    
    // Obtener el registro recién creado
    const result = await pool.query(
      'SELECT * FROM socios ORDER BY id DESC LIMIT 1'
    );
    res.status(201).json((result.rows || result)[0]);
  } catch (err) {
    console.error('Error al crear socio:', err);
    res.status(500).json({ error: 'Error al crear socio' });
  }
});

// PUT - Actualizar socio
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { numero_socio, nombre, apellido, dni, telefono, email, fecha_nacimiento, direccion, estado, observaciones } = req.body;

  try {
    // Verificar si ya existe el número de socio o DNI en otro registro
    const existente = await pool.query(
      'SELECT id FROM socios WHERE (numero_socio = ? OR dni = ?) AND id != ?',
      [numero_socio, dni, id]
    );
    
    if ((existente.rows || existente).length > 0) {
      return res.status(400).json({ error: 'Ya existe otro socio con ese número o DNI' });
    }

    await pool.query(
      `UPDATE socios SET 
         numero_socio = COALESCE(?, numero_socio),
         nombre = COALESCE(?, nombre),
         apellido = COALESCE(?, apellido),
         dni = COALESCE(?, dni),
         telefono = COALESCE(?, telefono),
         email = COALESCE(?, email),
         fecha_nacimiento = COALESCE(?, fecha_nacimiento),
         direccion = COALESCE(?, direccion),
         estado = COALESCE(?, estado),
         observaciones = COALESCE(?, observaciones)
       WHERE id = ?`,
      [numero_socio, nombre, apellido, dni, telefono, email, fecha_nacimiento, direccion, estado, observaciones, id]
    );
    
    // Obtener el registro actualizado
    const result = await pool.query(
      'SELECT * FROM socios WHERE id = ?',
      [id]
    );
    const data = result.rows || result;
    if (data.length === 0) return res.status(404).json({ error: 'Socio no encontrado' });
    res.json(data[0]);
  } catch (err) {
    console.error('Error al actualizar socio:', err);
    res.status(500).json({ error: 'Error al actualizar socio' });
  }
});

// DELETE - Eliminar socio
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el socio tiene inscripciones activas
    const inscripciones = await pool.query(
      'SELECT COUNT(*) as count FROM inscripciones WHERE socio_id = ? AND estado = "activa"',
      [id]
    );
    
    if ((inscripciones.rows || inscripciones)[0].count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un socio con inscripciones activas' });
    }

    const result = await pool.query('DELETE FROM socios WHERE id = ?', [id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Socio no encontrado' });
    res.json({ message: 'Socio eliminado con éxito' });
  } catch (err) {
    console.error('Error al eliminar socio:', err);
    res.status(500).json({ error: 'Error al eliminar socio' });
  }
});

module.exports = router;
