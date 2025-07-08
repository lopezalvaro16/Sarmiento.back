const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar productos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos_buffet ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Agregar producto
router.post('/', async (req, res) => {
  const { nombre, cantidad, unidad, precio, proveedor, estado, responsable } = req.body;
  if (!nombre || !unidad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    // Calcular unidades sueltas iniciales como cantidad * unidad
    const unidadesSueltas = (parseInt(cantidad) || 0) * (parseInt(unidad) || 0);
    const result = await pool.query(
      `INSERT INTO productos_buffet (nombre, cantidad, unidad, precio, proveedor, estado, unidad_suelta)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, cantidad || 0, unidad, precio, proveedor, estado || 'activo', unidadesSueltas]
    );
    // Registrar movimiento de stock (entrada inicial)
    await pool.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
       VALUES ($1, $2, $3, $4, $5)` ,
      [result.rows[0].id, 'entrada', unidadesSueltas, responsable || null, 'Alta de producto']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al agregar producto:', err);
    res.status(500).json({ error: 'Error al agregar producto' });
  }
});

// Editar producto
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, cantidad, precio, proveedor, estado, responsable } = req.body;
  try {
    const result = await pool.query(
      `UPDATE productos_buffet SET
         nombre = COALESCE($1, nombre),
         cantidad_unidades = COALESCE($2, cantidad_unidades),
         precio = COALESCE($3, precio),
         proveedor = COALESCE($4, proveedor),
         estado = COALESCE($5, estado)
       WHERE id = $6 RETURNING *`,
      [nombre, cantidad, precio, proveedor, estado, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    // Registrar movimiento de stock (edición)
    if (cantidad) {
      await pool.query(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
         VALUES ($1, $2, $3, $4, $5)` ,
        [id, 'edicion', cantidad, responsable || null, 'Edición de producto']
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al editar producto:', err);
    res.status(500).json({ error: 'Error al editar producto' });
  }
});

// Obtener historial de movimientos de un producto
router.get('/:id/movimientos', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM movimientos_stock WHERE producto_id = $1 ORDER BY fecha DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener movimientos:', err);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// Eliminar producto (baja lógica)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE productos_buffet SET estado = 'inactivo' WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

module.exports = router; 