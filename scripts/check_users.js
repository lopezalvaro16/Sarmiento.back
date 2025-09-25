const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta a la base de datos
const dbPath = path.join(__dirname, '..', '..', 'club.db');

console.log('🔍 Verificando usuarios en la base de datos...');
console.log('📁 Base de datos:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
  console.log('✅ Conectado a la base de datos SQLite');
});

// Verificar usuarios
db.all("SELECT id, username, role, password FROM admins", (err, rows) => {
  if (err) {
    console.error('❌ Error al consultar usuarios:', err.message);
    process.exit(1);
  }
  
  console.log('\n📋 Usuarios encontrados:');
  console.log('ID | Usuario | Rol | Password Hash');
  console.log('---|---------|-----|--------------');
  
  if (rows.length === 0) {
    console.log('❌ No se encontraron usuarios en la base de datos');
  } else {
    rows.forEach(user => {
      console.log(`${user.id} | ${user.username} | ${user.role} | ${user.password.substring(0, 20)}...`);
    });
  }
  
  // Verificar específicamente el usuario 'socios'
  const sociosUser = rows.find(user => user.username === 'socios');
  if (sociosUser) {
    console.log('\n✅ Usuario "socios" encontrado');
    console.log('   ID:', sociosUser.id);
    console.log('   Rol:', sociosUser.role);
    console.log('   Password Hash:', sociosUser.password);
  } else {
    console.log('\n❌ Usuario "socios" NO encontrado');
  }
  
  db.close((err) => {
    if (err) {
      console.error('❌ Error al cerrar la base de datos:', err.message);
    } else {
      console.log('\n✅ Conexión cerrada');
    }
  });
});
