const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar ventas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, p.nombre AS producto_nombre, p.unidad AS producto_unidad
       FROM ventas_buffet v
       JOIN productos_buffet p ON v.producto_id = p.id
       ORDER BY v.fecha DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Registrar venta
router.post('/', async (req, res) => {
  const { producto_id, unidad, responsable, observacion } = req.body;
  if (!producto_id || !unidad) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Registrar la venta (cantidad = 0 porque solo se venden unidades sueltas)
    const unidadesVendidas = parseInt(unidad) || 0;
    const ventaResult = await client.query(
      `INSERT INTO ventas_buffet (producto_id, cantidad, unidad, responsable, observacion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [producto_id, 0, unidadesVendidas, responsable || null, observacion || null]
    );
    // Obtener stock actual
    const prodResult = await client.query(
      `SELECT cantidad, unidad, unidad_suelta FROM productos_buffet WHERE id = $1`, [producto_id]
    );
    if (prodResult.rows.length === 0) throw new Error('Producto no encontrado');
    let packs = parseInt(prodResult.rows[0].cantidad) || 0;
    let unidadesPorPack = parseInt(prodResult.rows[0].unidad) || 1;
    let sueltas = parseInt(prodResult.rows[0].unidad_suelta) || 0;
    if (unidadesVendidas > sueltas + packs * unidadesPorPack) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No hay suficiente stock para vender' });
    }
    // Restar del stock total de sueltas
    sueltas -= unidadesVendidas;
    await client.query(
      `UPDATE productos_buffet SET unidad_suelta = $1 WHERE id = $2`,
      [sueltas, producto_id]
    );
    // Registrar movimiento de salida
    await client.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
       VALUES ($1, $2, $3, $4, $5)` ,
      [producto_id, 'salida', unidad, responsable || null, observacion || 'Venta']
    );
    await client.query('COMMIT');
    res.status(201).json(ventaResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar venta:', err);
    res.status(500).json({ error: 'Error al registrar venta' });
  } finally {
    client.release();
  }
});

module.exports = router; 