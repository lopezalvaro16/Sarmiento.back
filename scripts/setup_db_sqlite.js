const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function run() {
  // Crear la base de datos en el directorio raíz del proyecto
  const dbPath = path.join(__dirname, '..', '..', 'club.db');
  const db = new sqlite3.Database(dbPath);

  console.log('🚀 Iniciando setup de base de datos SQLite...');
  console.log('📁 Base de datos:', dbPath);

  try {
    // Crear tablas
    console.log('📝 Creando tablas...');
    
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS reservas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha DATE NOT NULL,
          hora_desde TIME NOT NULL,
          hora_hasta TIME NOT NULL,
          cancha TEXT NOT NULL,
          socio TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'Pendiente'
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS mantenimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha DATE NOT NULL,
          descripcion TEXT NOT NULL,
          estado TEXT NOT NULL DEFAULT 'pendiente',
          responsable TEXT,
          cancha TEXT NOT NULL
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS productos_buffet (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          precio NUMERIC(12,2) NOT NULL DEFAULT 0,
          stock INTEGER NOT NULL DEFAULT 0
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS ventas_buffet (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          producto_id INTEGER NOT NULL,
          cantidad INTEGER NOT NULL,
          total NUMERIC(12,2) NOT NULL,
          fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS establecimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE,
          descripcion TEXT
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Crear índices
    console.log('📊 Creando índices...');
    
    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_reservas_fecha_cancha ON reservas (fecha, cancha);`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_mant_fecha ON mantenimientos (fecha);`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Insertar datos iniciales
    console.log('🌱 Insertando datos iniciales...');

    // Verificar si ya existen admins
    const adminCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM admins', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (adminCount === 0) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('1234', 10);
      
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO admins (username, password, role) VALUES 
          ('canchas', ?, 'canchas'),
          ('cobranzas', ?, 'cobranzas'),
          ('buffet', ?, 'buffet')
        `, [hash, hash, hash], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Admins iniciales creados (pass: 1234)');
    } else {
      console.log('ℹ️  Admins ya existen, no se insertan');
    }

    // Verificar si ya existen establecimientos
    const establecimientosCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM establecimientos', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (establecimientosCount === 0) {
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO establecimientos (nombre, descripcion) VALUES 
          ('Salón Principal', 'Salón principal para eventos y reuniones'),
          ('Cancha 1', 'Cancha de fútbol principal'),
          ('Cancha 2', 'Cancha de fútbol secundaria'),
          ('Quincho', 'Área de quincho para asados y eventos al aire libre'),
          ('Pileta', 'Piscina del club'),
          ('Gimnasio', 'Gimnasio con equipamiento deportivo')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Establecimientos iniciales creados');
    } else {
      console.log('ℹ️  Establecimientos ya existen, no se insertan');
    }

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas...');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log('📋 Tablas creadas:', tables.map(t => t.name).join(', '));

    console.log('🎉 Setup DB completado con éxito!');
    console.log('💡 Ahora puedes reiniciar el servidor con: pm2 restart back-sarmiento --update-env');

  } catch (err) {
    console.error('❌ Error en setup DB:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

run();
