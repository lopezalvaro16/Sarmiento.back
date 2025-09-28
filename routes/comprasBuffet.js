const express = require('express');
const router = express.Router();
const pool = require('../db_sqlite');

// Listar compras
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.nombre AS producto_nombre, p.unidad AS producto_unidad
       FROM compras_buffet c
       JOIN productos_buffet p ON c.producto_id = p.id
       ORDER BY c.fecha DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener compras:', err);
    res.status(500).json({ error: 'Error al obtener compras' });
  }
});

// Registrar compra
router.post('/', async (req, res) => {
  const { producto_id, cantidad, precio_total, proveedor, responsable, observacion } = req.body;
  
  if (!producto_id || !cantidad || !precio_total) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Registrar la compra
    const compraResult = await client.query(
      `INSERT INTO compras_buffet (producto_id, cantidad, precio_total, proveedor, responsable, observacion)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [producto_id, cantidad, precio_total, proveedor || null, responsable || null, observacion || null]
    );
    
    // Actualizar stock del producto
    const prodResult = await client.query(
      `SELECT cantidad, unidad FROM productos_buffet WHERE id = $1`, [producto_id]
    );
    
    if (prodResult.rows.length === 0) {
      throw new Error('Producto no encontrado');
    }
    
    const stockActual = parseInt(prodResult.rows[0].cantidad) || 0;
    const nuevaCantidad = stockActual + parseInt(cantidad);
    
    await client.query(
      `UPDATE productos_buffet SET cantidad = $1 WHERE id = $2`,
      [nuevaCantidad, producto_id]
    );
    
    // Registrar movimiento de entrada
    await client.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
       VALUES ($1, $2, $3, $4, $5)`,
      [producto_id, 'entrada', cantidad, responsable || null, observacion || 'Compra']
    );
    
    await client.query('COMMIT');
    res.status(201).json(compraResult.rows[0]);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar compra:', err);
    res.status(500).json({ error: 'Error al registrar compra' });
  } finally {
    client.release();
  }
});

// Obtener compra por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT c.*, p.nombre AS producto_nombre, p.unidad AS producto_unidad
       FROM compras_buffet c
       JOIN productos_buffet p ON c.producto_id = p.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener compra:', err);
    res.status(500).json({ error: 'Error al obtener compra' });
  }
});

// Editar compra
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { producto_id, cantidad, precio_total, proveedor, responsable, observacion } = req.body;
  
  if (!producto_id || !cantidad || !precio_total) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Obtener compra original para calcular diferencia
    const compraOriginal = await client.query(
      'SELECT * FROM compras_buffet WHERE id = $1', [id]
    );
    
    if (compraOriginal.rows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    const diferenciaCantidad = parseInt(cantidad) - parseInt(compraOriginal.rows[0].cantidad);
    
    // Actualizar compra
    const result = await client.query(
      `UPDATE compras_buffet 
       SET producto_id = $1, cantidad = $2, precio_total = $3, proveedor = $4, 
           responsable = $5, observacion = $6, fecha_modificacion = NOW()
       WHERE id = $7 RETURNING *`,
      [producto_id, cantidad, precio_total, proveedor || null, responsable || null, 
       observacion || null, id]
    );
    
    // Ajustar stock del producto
    if (diferenciaCantidad !== 0) {
      const prodResult = await client.query(
        `SELECT cantidad FROM productos_buffet WHERE id = $1`, [producto_id]
      );
      
      const stockActual = parseInt(prodResult.rows[0].cantidad) || 0;
      const nuevaCantidad = stockActual + diferenciaCantidad;
      
      await client.query(
        `UPDATE productos_buffet SET cantidad = $1 WHERE id = $2`,
        [nuevaCantidad, producto_id]
      );
      
      // Registrar movimiento de ajuste
      await client.query(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
         VALUES ($1, $2, $3, $4, $5)`,
        [producto_id, diferenciaCantidad > 0 ? 'entrada' : 'salida', 
         Math.abs(diferenciaCantidad), responsable || null, 'Ajuste por edición de compra']
      );
    }
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al editar compra:', err);
    res.status(500).json({ error: 'Error al editar compra' });
  } finally {
    client.release();
  }
});

// Eliminar compra
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Obtener compra para revertir stock
    const compraResult = await client.query(
      'SELECT * FROM compras_buffet WHERE id = $1', [id]
    );
    
    if (compraResult.rows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    const compra = compraResult.rows[0];
    
    // Revertir stock
    const prodResult = await client.query(
      `SELECT cantidad FROM productos_buffet WHERE id = $1`, [compra.producto_id]
    );
    
    const stockActual = parseInt(prodResult.rows[0].cantidad) || 0;
    const nuevaCantidad = stockActual - parseInt(compra.cantidad);
    
    await client.query(
      `UPDATE productos_buffet SET cantidad = $1 WHERE id = $2`,
      [nuevaCantidad, compra.producto_id]
    );
    
    // Registrar movimiento de reversión
    await client.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
       VALUES ($1, $2, $3, $4, $5)`,
      [compra.producto_id, 'salida', compra.cantidad, compra.responsable || null, 'Reversión por eliminación de compra']
    );
    
    // Eliminar compra
    await client.query('DELETE FROM compras_buffet WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    res.json({ message: 'Compra eliminada correctamente' });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar compra:', err);
    res.status(500).json({ error: 'Error al eliminar compra' });
  } finally {
    client.release();
  }
});

module.exports = router;
