const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('club.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  // Ejemplo: crea un admin de cada tipo (contraseña: 1234 para todos)
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('1234', 10);

  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('canchas', ?, 'canchas')`, [hash]);
  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('cobranzas', ?, 'cobranzas')`, [hash]);
  db.run(`INSERT OR IGNORE INTO admins (username, password, role) VALUES ('buffet', ?, 'buffet')`, [hash]);
});

db.close();
console.log('Base de datos inicializada'); 