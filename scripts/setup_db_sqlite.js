const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { execSync } = require('child_process');

// Cargar variables de entorno
require('dotenv').config();

async function run() {
  // Verificar e instalar dependencias necesarias para documentos
  console.log('📦 Verificando dependencias para documentos...');
  try {
    require('multer');
    require('@octokit/rest');
    console.log('✅ Dependencias de documentos ya instaladas');
  } catch (error) {
    console.log('📥 Instalando dependencias de documentos...');
    try {
      execSync('npm install multer @octokit/rest', { stdio: 'inherit' });
      console.log('✅ Dependencias de documentos instaladas');
    } catch (installError) {
      console.log('⚠️  Error instalando dependencias:', installError.message);
      console.log('💡 Instala manualmente: npm install multer @octokit/rest');
    }
  }

  // Verificar variables de entorno para documentos
  console.log('🔧 Verificando variables de entorno para documentos...');
  const requiredEnvVars = ['GITHUB_TOKEN', 'GITHUB_REPO_OWNER', 'GITHUB_REPO_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️  Variables de entorno faltantes para documentos:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('💡 Agrega estas variables al archivo .env:');
    console.log('   GITHUB_TOKEN=tu_token_de_github');
    console.log('   GITHUB_REPO_OWNER=tu_usuario_github');
    console.log('   GITHUB_REPO_NAME=club-sarmiento-docs');
  } else {
    console.log('✅ Variables de entorno para documentos configuradas');
  }
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

    // Crear tabla establecimientos
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS establecimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE,
          descripcion TEXT
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Crear tabla socios
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS socios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero_socio TEXT UNIQUE NOT NULL,
          nombre TEXT NOT NULL,
          apellido TEXT NOT NULL,
          dni TEXT UNIQUE NOT NULL,
          telefono TEXT,
          email TEXT,
          fecha_nacimiento DATE,
          direccion TEXT,
          fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
          estado TEXT NOT NULL DEFAULT 'activo',
          observaciones TEXT
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Crear tabla actividades
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS actividades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          instructor TEXT NOT NULL,
          horario TEXT NOT NULL,
          dias_semana TEXT NOT NULL,
          cupo_maximo INTEGER,
          cupo_actual INTEGER DEFAULT 0,
          precio NUMERIC(12,2) DEFAULT 0,
          estado TEXT NOT NULL DEFAULT 'activa',
          fecha_inicio DATE,
          fecha_fin DATE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Crear tabla inscripciones
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS inscripciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          socio_id INTEGER NOT NULL,
          actividad_id INTEGER NOT NULL,
          fecha_inscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
          estado TEXT NOT NULL DEFAULT 'activa',
          fecha_baja DATE,
          observaciones TEXT,
          FOREIGN KEY (socio_id) REFERENCES socios(id),
          FOREIGN KEY (actividad_id) REFERENCES actividades(id),
          UNIQUE(socio_id, actividad_id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Crear tabla documentos
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS documentos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          categoria TEXT NOT NULL,
          fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
          mes INTEGER NOT NULL,
          año INTEGER NOT NULL,
          tamaño TEXT NOT NULL,
          tipo_archivo TEXT NOT NULL,
          url_github TEXT NOT NULL,
          sha TEXT NOT NULL,
          descripcion TEXT DEFAULT '',
          usuario_subida TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
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

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_documentos_mes_año ON documentos (mes, año);`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON documentos (categoria);`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas...');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log('📋 Tablas creadas:', tables.map(t => t.name).join(', '));

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
          ('buffet', ?, 'buffet'),
          ('socios', ?, 'socios')
        `, [hash, hash, hash, hash], (err) => {
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

    // Insertar actividades iniciales
    const actividadesCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM actividades", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (actividadesCount === 0) {
      await new Promise((resolve, reject) => {
        db.run(`INSERT INTO actividades (nombre, descripcion, instructor, horario, dias_semana, cupo_maximo, precio, estado) VALUES 
          ('Fútbol', 'Clases de fútbol para todas las edades', 'Carlos López', '18:00 - 19:30', 'Lunes, Miércoles, Viernes', 20, 5000, 'activa'),
          ('Volley', 'Clases de vóley para principiantes y avanzados', 'María González', '19:00 - 20:30', 'Martes, Jueves', 15, 4500, 'activa'),
          ('Hockey', 'Hockey sobre césped', 'Roberto Silva', '17:30 - 19:00', 'Lunes, Miércoles', 18, 6000, 'activa'),
          ('Natación', 'Clases de natación', 'Ana Martínez', '16:00 - 17:30', 'Martes, Jueves, Sábado', 12, 7000, 'activa'),
          ('Tenis', 'Clases de tenis', 'Luis Fernández', '18:30 - 20:00', 'Lunes, Miércoles, Viernes', 8, 8000, 'activa'),
          ('Gimnasia', 'Gimnasia artística', 'Sofia Rodríguez', '17:00 - 18:30', 'Martes, Jueves', 10, 4000, 'activa')
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Actividades iniciales creadas');
    } else {
      console.log('ℹ️  Actividades ya existen, no se insertan');
    }

    console.log('🎉 Setup DB completado con éxito!');
    console.log('💡 Ahora puedes reiniciar el servidor con: pm2 restart back-sarmiento --update-env');
    console.log('');
    console.log('📁 Funcionalidad de documentos incluida:');
    console.log('   ✅ Tabla documentos creada');
    console.log('   ✅ Índices optimizados');
    console.log('   ✅ Dependencias verificadas');
    console.log('   ✅ Variables de entorno verificadas');
    console.log('');
    console.log('🚀 Para usar documentos:');
    console.log('   1. Configura las variables de entorno si faltan');
    console.log('   2. Reinicia el servidor');
    console.log('   3. Ve a la sección "Documentos" en el rol "socios"');

  } catch (err) {
    console.error('❌ Error en setup DB:', err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

run();
