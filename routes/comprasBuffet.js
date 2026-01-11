const express = require('express');
const router = express.Router();
const pool = require('../db');

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

  try {
    // Registrar la compra
    const compraResult = await pool.query(
      `INSERT INTO compras_buffet (producto_id, cantidad, precio_total, proveedor, responsable, observacion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [producto_id, cantidad, precio_total, proveedor || null, responsable || null, observacion || null]
    );
    
    // Obtener el ID de la compra insertada
    const compraId = compraResult.lastID;
    
    // Actualizar stock del producto
    const prodResult = await pool.query(
      `SELECT cantidad, unidad FROM productos_buffet WHERE id = ?`, [producto_id]
    );
    
    if (prodResult.rows.length === 0) {
      throw new Error('Producto no encontrado');
    }
    
    const stockActual = parseInt(prodResult.rows[0].cantidad) || 0;
    const nuevaCantidad = stockActual + parseInt(cantidad);
    
    await pool.query(
      `UPDATE productos_buffet SET cantidad = ? WHERE id = ?`,
      [nuevaCantidad, producto_id]
    );
    
    // Registrar movimiento de entrada
    await pool.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
       VALUES (?, ?, ?, ?, ?)`,
      [producto_id, 'entrada', cantidad, responsable || null, observacion || 'Compra']
    );
    
    // Obtener la compra completa para devolverla
    const compraCompleta = await pool.query(
      `SELECT c.*, p.nombre AS producto_nombre, p.unidad AS producto_unidad
       FROM compras_buffet c
       JOIN productos_buffet p ON c.producto_id = p.id
       WHERE c.id = ?`,
      [compraId]
    );
    
    res.status(201).json(compraCompleta.rows[0]);
    
  } catch (err) {
    console.error('Error al registrar compra:', err);
    res.status(500).json({ error: 'Error al registrar compra' });
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

  try {
    // Obtener compra original para calcular diferencia
    const compraOriginal = await pool.query(
      'SELECT * FROM compras_buffet WHERE id = ?', [id]
    );
    
    if (compraOriginal.rows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    const diferenciaCantidad = parseInt(cantidad) - parseInt(compraOriginal.rows[0].cantidad);
    
    // Actualizar compra
    const result = await pool.query(
      `UPDATE compras_buffet 
       SET producto_id = ?, cantidad = ?, precio_total = ?, proveedor = ?, 
           responsable = ?, observacion = ?, fecha_modificacion = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [producto_id, cantidad, precio_total, proveedor || null, responsable || null, 
       observacion || null, id]
    );
    
    // Ajustar stock del producto
    if (diferenciaCantidad !== 0) {
      const prodResult = await pool.query(
        `SELECT cantidad FROM productos_buffet WHERE id = ?`, [producto_id]
      );
      
      const stockActual = parseInt(prodResult.rows[0].cantidad) || 0;
      const nuevaCantidad = stockActual + diferenciaCantidad;
      
      await pool.query(
        `UPDATE productos_buffet SET cantidad = ? WHERE id = ?`,
        [nuevaCantidad, producto_id]
      );
      
      // Registrar movimiento de ajuste
      await pool.query(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
         VALUES (?, ?, ?, ?, ?)`,
        [producto_id, diferenciaCantidad > 0 ? 'entrada' : 'salida', 
         Math.abs(diferenciaCantidad), responsable || null, 'Ajuste por edición de compra']
      );
    }
    
    // Obtener la compra actualizada
    const compraActualizada = await pool.query(
      `SELECT c.*, p.nombre AS producto_nombre, p.unidad AS producto_unidad
       FROM compras_buffet c
       JOIN productos_buffet p ON c.producto_id = p.id
       WHERE c.id = ?`,
      [id]
    );
    
    res.json(compraActualizada.rows[0]);
    
  } catch (err) {
    console.error('Error al editar compra:', err);
    res.status(500).json({ error: 'Error al editar compra' });
  }
});

// Eliminar compra
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Obtener compra para revertir stock
    const compraResult = await pool.query(
      'SELECT * FROM compras_buffet WHERE id = ?', [id]
    );
    
    if (compraResult.rows.length === 0) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    
    const compra = compraResult.rows[0];
    
    // Revertir stock
    const prodResult = await pool.query(
      `SELECT cantidad FROM productos_buffet WHERE id = ?`, [compra.producto_id]
    );
    
    const stockActual = parseInt(prodResult.rows[0].cantidad) || 0;
    const nuevaCantidad = stockActual - parseInt(compra.cantidad);
    
    await pool.query(
      `UPDATE productos_buffet SET cantidad = ? WHERE id = ?`,
      [nuevaCantidad, compra.producto_id]
    );
    
    // Registrar movimiento de reversión
    await pool.query(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, responsable, observacion)
       VALUES (?, ?, ?, ?, ?)`,
      [compra.producto_id, 'salida', compra.cantidad, compra.responsable || null, 'Reversión por eliminación de compra']
    );
    
    // Eliminar compra
    await pool.query('DELETE FROM compras_buffet WHERE id = ?', [id]);
    
    res.json({ message: 'Compra eliminada correctamente' });
    
  } catch (err) {
    console.error('Error al eliminar compra:', err);
    res.status(500).json({ error: 'Error al eliminar compra' });
  }
});

module.exports = router;
