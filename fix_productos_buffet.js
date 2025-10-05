const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usar la misma ruta que db_sqlite.js
const dbPath = path.join(__dirname, '..', 'club.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Reparando tabla productos_buffet en producción...');
console.log('📁 Base de datos:', dbPath);

db.serialize(() => {
  // Verificar estructura actual de la tabla
  console.log('📊 Verificando estructura actual...');
  
  db.all("PRAGMA table_info(productos_buffet)", (err, columns) => {
    if (err) {
      console.error('❌ Error verificando estructura:', err);
      db.close();
      return;
    }
    
    console.log('📋 Columnas actuales:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    const columnNames = columns.map(col => col.name);
    let needsUpdate = false;
    
    // Agregar columna cantidad si no existe
    if (!columnNames.includes('cantidad')) {
      console.log('➕ Agregando columna cantidad...');
      db.run("ALTER TABLE productos_buffet ADD COLUMN cantidad INTEGER NOT NULL DEFAULT 0", (err) => {
        if (err) {
          console.error('❌ Error agregando cantidad:', err.message);
        } else {
          console.log('✅ Columna cantidad agregada');
          needsUpdate = true;
        }
      });
    } else {
      console.log('✅ Columna cantidad ya existe');
    }
    
    // Agregar columna unidad si no existe
    if (!columnNames.includes('unidad')) {
      console.log('➕ Agregando columna unidad...');
      db.run("ALTER TABLE productos_buffet ADD COLUMN unidad INTEGER NOT NULL DEFAULT 1", (err) => {
        if (err) {
          console.error('❌ Error agregando unidad:', err.message);
        } else {
          console.log('✅ Columna unidad agregada');
          needsUpdate = true;
        }
      });
    } else {
      console.log('✅ Columna unidad ya existe');
    }
    
    // Agregar columna proveedor si no existe
    if (!columnNames.includes('proveedor')) {
      console.log('➕ Agregando columna proveedor...');
      db.run("ALTER TABLE productos_buffet ADD COLUMN proveedor TEXT", (err) => {
        if (err) {
          console.error('❌ Error agregando proveedor:', err.message);
        } else {
          console.log('✅ Columna proveedor agregada');
          needsUpdate = true;
        }
      });
    } else {
      console.log('✅ Columna proveedor ya existe');
    }
    
    // Agregar columna estado si no existe
    if (!columnNames.includes('estado')) {
      console.log('➕ Agregando columna estado...');
      db.run("ALTER TABLE productos_buffet ADD COLUMN estado TEXT NOT NULL DEFAULT 'activo'", (err) => {
        if (err) {
          console.error('❌ Error agregando estado:', err.message);
        } else {
          console.log('✅ Columna estado agregada');
          needsUpdate = true;
        }
      });
    } else {
      console.log('✅ Columna estado ya existe');
    }
    
    // Agregar columna fecha_creacion si no existe
    if (!columnNames.includes('fecha_creacion')) {
      console.log('➕ Agregando columna fecha_creacion...');
      db.run("ALTER TABLE productos_buffet ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (err) {
          console.error('❌ Error agregando fecha_creacion:', err.message);
        } else {
          console.log('✅ Columna fecha_creacion agregada');
          needsUpdate = true;
        }
      });
    } else {
      console.log('✅ Columna fecha_creacion ya existe');
    }
    
    // Agregar columna fecha_modificacion si no existe
    if (!columnNames.includes('fecha_modificacion')) {
      console.log('➕ Agregando columna fecha_modificacion...');
      db.run("ALTER TABLE productos_buffet ADD COLUMN fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => {
        if (err) {
          console.error('❌ Error agregando fecha_modificacion:', err.message);
        } else {
          console.log('✅ Columna fecha_modificacion agregada');
          needsUpdate = true;
        }
      });
    } else {
      console.log('✅ Columna fecha_modificacion ya existe');
    }
    
    // Esperar un momento para que las operaciones ALTER terminen
    setTimeout(() => {
      // Actualizar productos existentes con valores por defecto
      console.log('🔄 Actualizando productos existentes...');
      db.run(`UPDATE productos_buffet SET 
        cantidad = COALESCE(cantidad, 0),
        unidad = COALESCE(unidad, 1),
        estado = COALESCE(estado, 'activo'),
        fecha_creacion = COALESCE(fecha_creacion, CURRENT_TIMESTAMP),
        fecha_modificacion = COALESCE(fecha_modificacion, CURRENT_TIMESTAMP)
        WHERE cantidad IS NULL OR unidad IS NULL OR estado IS NULL`, (err) => {
        if (err) {
          console.log('⚠️  Error actualizando productos existentes:', err.message);
        } else {
          console.log('✅ Productos existentes actualizados');
        }
        
        // Insertar productos iniciales del buffet
        console.log('📦 Insertando productos iniciales...');
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
            console.log('✅ Productos iniciales insertados');
          }
          
          // Verificar resultado final
          db.all("SELECT COUNT(*) as total FROM productos_buffet", (err, rows) => {
            if (err) {
              console.error('❌ Error verificando resultado:', err);
            } else {
              console.log(`📊 Total de productos en la base de datos: ${rows[0].total}`);
            }
            
            console.log('🎉 Reparación de productos_buffet completada');
            
            db.close((err) => {
              if (err) {
                console.error('❌ Error cerrando base de datos:', err);
                process.exit(1);
              } else {
                console.log('✅ Base de datos cerrada correctamente');
                console.log('🚀 La tabla productos_buffet está lista para usar');
              }
            });
          });
        });
      });
    }, 1000); // Esperar 1 segundo para que las operaciones ALTER terminen
  });
});


