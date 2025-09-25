const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Ruta a la base de datos
const dbPath = path.join(__dirname, '..', '..', 'club.db');

console.log('🔧 Creando usuario "socios" si no existe...');
console.log('📁 Base de datos:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a la base de datos SQLite');
});

async function createSociosUser() {
  try {
    // Verificar si el usuario ya existe
    const existingUser = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM admins WHERE username = 'socios'", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      console.log('ℹ️  Usuario "socios" ya existe');
      return;
    }

    // Crear hash de la contraseña
    const password = '1234';
    const hash = bcrypt.hashSync(password, 10);
    console.log('🔐 Hash de contraseña generado');

    // Insertar usuario
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO admins (username, password, role) VALUES (?, ?, ?)",
        ['socios', hash, 'socios'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    console.log('✅ Usuario "socios" creado exitosamente');
    console.log('   Username: socios');
    console.log('   Password: 1234');
    console.log('   Role: socios');

  } catch (err) {
    console.error('❌ Error al crear usuario:', err.message);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error al cerrar la base de datos:', err.message);
      } else {
        console.log('✅ Conexión cerrada');
      }
    });
  }
}

createSociosUser();
