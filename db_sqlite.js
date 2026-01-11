const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Crear la base de datos en el directorio raíz del proyecto (mismo lugar que setup_db_sqlite.js)
const dbPath = path.join(__dirname, '..', '..', 'club.db');
const db = new sqlite3.Database(dbPath);

// Wrapper para hacer que la API sea compatible con PostgreSQL
const dbWrapper = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      if (sql.trim().toLowerCase().startsWith('select')) {
        db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      } else {
        // Para operaciones INSERT, UPDATE, DELETE
        db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              rows: [{ id: this.lastID, changes: this.changes }],
              lastID: this.lastID,
              changes: this.changes
            });
          }
        });
      }
    });
  },
  
  close: () => {
    return new Promise((resolve) => {
      db.close(resolve);
    });
  }
};

module.exports = dbWrapper;
