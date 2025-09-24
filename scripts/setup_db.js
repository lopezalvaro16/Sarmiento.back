require('dotenv').config();
const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: process.env.PGPORT,
  });

  const client = await pool.connect();
  try {
    console.log('Conectando a Postgres...');
    await client.query('BEGIN');

    // Tablas
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        hora_desde TIME NOT NULL,
        hora_hasta TIME NOT NULL,
        cancha TEXT NOT NULL,
        socio TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Pendiente'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mantenimientos (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        descripcion TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        responsable TEXT,
        cancha TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS productos_buffet (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio NUMERIC(12,2) NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas_buffet (
        id SERIAL PRIMARY KEY,
        producto_id INTEGER NOT NULL REFERENCES productos_buffet(id) ON DELETE CASCADE,
        cantidad INTEGER NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        fecha TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Índices útiles
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reservas_fecha_cancha ON reservas (fecha, cancha);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mant_fecha ON mantenimientos (fecha);`);

    // Seeds de admins si no existen
    const bcrypt = require('bcryptjs');
    const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM admins`);
    if (rows[0].c === 0) {
      const hash = bcrypt.hashSync('1234', 10);
      await client.query(`INSERT INTO admins (username, password, role) VALUES 
        ('canchas', $1, 'canchas'),
        ('cobranzas', $1, 'cobranzas'),
        ('buffet', $1, 'buffet')
      `, [hash]);
      console.log('Admins iniciales creados (pass: 1234)');
    } else {
      console.log('Admins ya existen, no se insertan');
    }

    await client.query('COMMIT');
    console.log('Setup DB completado con éxito.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en setup DB:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();


