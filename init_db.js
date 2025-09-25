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

  db.run(`CREATE TABLE IF NOT EXISTS socios (
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    instructor TEXT,
    horario TEXT,
    dias_semana TEXT,
    cupo_maximo INTEGER,
    precio DECIMAL(10,2),
    estado TEXT NOT NULL DEFAULT 'activa',
    fecha_inicio DATE,
    fecha_fin DATE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS inscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    socio_id INTEGER NOT NULL,
    actividad_id INTEGER NOT NULL,
    fecha_inscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
    estado TEXT NOT NULL DEFAULT 'activa',
    fecha_baja DATE,
    observaciones TEXT,
    FOREIGN KEY (socio_id) REFERENCES socios (id),
    FOREIGN KEY (actividad_id) REFERENCES actividades (id),
    UNIQUE(socio_id, actividad_id)
  )`);

  // Ejemplo: crea un admin de cada tipo (contraseña: 1234 para todos)
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('1234', 10);

  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('canchas', ?, 'canchas')`, [hash]);
  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('cobranzas', ?, 'cobranzas')`, [hash]);
  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('buffet', ?, 'buffet')`, [hash]);
  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('socios', ?, 'socios')`, [hash]);

  // Establecimientos iniciales
  db.run(`INSERT OR IGNORE INTO establecimientos (nombre, descripcion) VALUES 
    ('Salón Principal', 'Salón principal para eventos y reuniones'),
    ('Cancha 1', 'Cancha de fútbol principal'),
    ('Cancha 2', 'Cancha de fútbol secundaria'),
    ('Quincho', 'Área de quincho para asados y eventos al aire libre'),
    ('Pileta', 'Piscina del club'),
    ('Gimnasio', 'Gimnasio con equipamiento deportivo')
  `);

  // Actividades iniciales
  db.run(`INSERT OR IGNORE INTO actividades (nombre, descripcion, instructor, horario, dias_semana, cupo_maximo, precio, fecha_inicio) VALUES 
    ('Fútbol', 'Entrenamiento de fútbol para todas las edades', 'Carlos Martínez', '18:00-20:00', 'Lunes, Miércoles, Viernes', 25, 5000.00, '2024-01-01'),
    ('Volley', 'Voleibol competitivo y recreativo', 'Ana López', '19:00-21:00', 'Martes, Jueves', 18, 4500.00, '2024-01-01'),
    ('Hockey', 'Hockey sobre césped', 'María González', '17:00-19:00', 'Martes, Jueves', 20, 5500.00, '2024-01-01'),
    ('Natación', 'Clases de natación y aqua aeróbicos', 'Pedro Rodríguez', '16:00-18:00', 'Lunes, Miércoles, Viernes', 15, 6000.00, '2024-01-01'),
    ('Tenis', 'Clases de tenis individuales y grupales', 'Laura Fernández', '15:00-17:00', 'Sábados', 12, 7000.00, '2024-01-01'),
    ('Gimnasia', 'Gimnasia y acondicionamiento físico', 'Roberto Silva', '07:00-09:00', 'Lunes a Viernes', 30, 4000.00, '2024-01-01')
  `);
});

db.close();
console.log('Base de datos inicializada'); 