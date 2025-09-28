const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usar la misma ruta que db_sqlite.js
const dbPath = path.join(__dirname, '..', 'club.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Iniciando migración del buffet en producción...');
console.log('📁 Base de datos:', dbPath);

db.serialize(() => {
  console.log('📊 Verificando tablas existentes...');
  
  // Verificar si las tablas del buffet ya existen
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='compras_buffet'", (err, row) => {
    if (err) {
      console.error('❌ Error verificando tablas:', err);
      return;
    }
    
    if (row) {
      console.log('✅ Las tablas del buffet ya existen. Migración no necesaria.');
      db.close();
      return;
    }
    
    console.log('🔧 Creando tablas del buffet...');
    
    // Actualizar tabla productos_buffet si existe
    db.run(`ALTER TABLE productos_buffet ADD COLUMN cantidad INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('⚠️  Columna cantidad ya existe o no se pudo agregar');
      }
    });
    
    db.run(`ALTER TABLE productos_buffet ADD COLUMN unidad INTEGER DEFAULT 1`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('⚠️  Columna unidad ya existe o no se pudo agregar');
      }
    });
    
    db.run(`ALTER TABLE productos_buffet ADD COLUMN proveedor TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('⚠️  Columna proveedor ya existe o no se pudo agregar');
      }
    });
    
    db.run(`ALTER TABLE productos_buffet ADD COLUMN estado TEXT DEFAULT 'activo'`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('⚠️  Columna estado ya existe o no se pudo agregar');
      }
    });
    
    db.run(`ALTER TABLE productos_buffet ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('⚠️  Columna fecha_creacion ya existe o no se pudo agregar');
      }
    });
    
    db.run(`ALTER TABLE productos_buffet ADD COLUMN fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.log('⚠️  Columna fecha_modificacion ya existe o no se pudo agregar');
      }
    });

    // Crear tabla compras_buffet
    db.run(`CREATE TABLE compras_buffet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_total DECIMAL(10,2) NOT NULL,
      proveedor TEXT,
      responsable TEXT,
      observacion TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos_buffet (id)
    )`, (err) => {
      if (err) {
        console.error('❌ Error creando compras_buffet:', err.message);
      } else {
        console.log('✅ Tabla compras_buffet creada');
      }
    });

    // Crear tabla ventas_buffet
    db.run(`CREATE TABLE ventas_buffet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 0,
      unidad INTEGER NOT NULL,
      responsable TEXT,
      observacion TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos_buffet (id)
    )`, (err) => {
      if (err) {
        console.error('❌ Error creando ventas_buffet:', err.message);
      } else {
        console.log('✅ Tabla ventas_buffet creada');
      }
    });

    // Crear tabla movimientos_stock
    db.run(`CREATE TABLE movimientos_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      responsable TEXT,
      observacion TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos_buffet (id)
    )`, (err) => {
      if (err) {
        console.error('❌ Error creando movimientos_stock:', err.message);
      } else {
        console.log('✅ Tabla movimientos_stock creada');
      }
    });

    // Actualizar productos existentes
    db.run(`UPDATE productos_buffet SET 
      cantidad = COALESCE(cantidad, 0),
      unidad = 1,
      estado = 'activo'
      WHERE cantidad IS NULL OR unidad IS NULL OR estado IS NULL`, (err) => {
      if (err) {
        console.log('⚠️  Error actualizando productos existentes:', err.message);
      } else {
        console.log('✅ Productos existentes actualizados');
      }
    });

    // Insertar productos iniciales del buffet
    db.run(`INSERT OR IGNORE INTO productos_buffet (nombre, cantidad, unidad, precio, proveedor, estado) VALUES 
      ('Coca Cola 500ml', 50, 24, 1200.00, 'Coca Cola Company', 'activo'),
      ('Agua Mineral 500ml', 30, 12, 800.00, 'Agua Pura', 'activo'),
      ('Sandwich Jamón y Queso', 20, 1, 1500.00, 'Panadería Central', 'activo'),
      ('Empanadas de Carne', 40, 6, 2000.00, 'Empanadas del Sur', 'activo'),
      ('Café', 10, 1, 500.00, 'Café Premium', 'activo'),
      ('Galletas', 25, 12, 600.00, 'Galletas del Norte', 'activo'),
      ('Jugo de Naranja', 15, 6, 900.00, 'Jugos Naturales', 'activo'),
      ('Alfajores', 30, 12, 800.00, 'Dulces del Club', 'activo')
    `, (err) => {
      if (err) {
        console.log('⚠️  Error insertando productos iniciales:', err.message);
      } else {
        console.log('✅ Productos iniciales del buffet insertados');
      }
      
      // Cerrar la base de datos DESPUÉS de que todas las operaciones terminen
      console.log('🎉 Migración del buffet completada exitosamente');
      
      db.close((err) => {
        if (err) {
          console.error('❌ Error cerrando base de datos:', err);
          process.exit(1);
        } else {
          console.log('✅ Base de datos cerrada correctamente');
          console.log('🚀 El buffet está listo para usar en producción');
        }
      });
    });
  });
});
