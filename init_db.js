const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('club.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    hora_desde TIME NOT NULL,
    hora_hasta TIME NOT NULL,
    cancha TEXT NOT NULL,
    socio TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'Pendiente'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS establecimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
  )`);

  // Ejemplo: crea un admin de cada tipo (contraseña: 1234 para todos)
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('1234', 10);

  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('canchas', ?, 'canchas')`, [hash]);
  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('cobranzas', ?, 'cobranzas')`, [hash]);
  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('buffet', ?, 'buffet')`, [hash]);

  // Establecimientos iniciales
  db.run(`INSERT OR IGNORE INTO establecimientos (nombre, descripcion) VALUES 
    ('Salón Principal', 'Salón principal para eventos y reuniones'),
    ('Cancha 1', 'Cancha de fútbol principal'),
    ('Cancha 2', 'Cancha de fútbol secundaria'),
    ('Quincho', 'Área de quincho para asados y eventos al aire libre'),
    ('Pileta', 'Piscina del club'),
    ('Gimnasio', 'Gimnasio con equipamiento deportivo')
  `);
});

db.close();
console.log('Base de datos inicializada'); 