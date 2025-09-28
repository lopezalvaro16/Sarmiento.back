const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db_sqlite');
const SECRET = 'club_sarmiento_secreto';
const reservasRouter = require('./routes/reservas');
const authRouter = require('./routes/auth');
const mantenimientosRouter = require('./routes/mantenimientos');
const productosBuffetRouter = require('./routes/productosBuffet');
const ventasBuffetRouter = require('./routes/ventasBuffet');
const comprasBuffetRouter = require('./routes/comprasBuffet');
const establecimientosRouter = require('./routes/establecimientos');
const sociosRouter = require('./routes/socios');
const actividadesRouter = require('./routes/actividades');
const inscripcionesRouter = require('./routes/inscripciones');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('Backend Club Sarmiento funcionando');
});

// Healthcheck: verifica servidor y conexión a BD
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'error', time: new Date().toISOString() });
  }
});

// --- ENDPOINTS DE RESERVAS ---
app.use('/reservas', reservasRouter);
app.use('/auth', authRouter);
app.use('/mantenimientos', mantenimientosRouter);
app.use('/productos_buffet', productosBuffetRouter);
app.use('/ventas_buffet', ventasBuffetRouter);
app.use('/compras_buffet', comprasBuffetRouter);
app.use('/establecimientos', establecimientosRouter);
app.use('/socios', sociosRouter);
app.use('/actividades', actividadesRouter);
app.use('/inscripciones', inscripcionesRouter);

// Aquí irá la lógica de login y admins

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend escuchando en http://0.0.0.0:${PORT}`);
});