const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const SECRET = 'club_sarmiento_secreto';
const reservasRouter = require('./routes/reservas');
const authRouter = require('./routes/auth');
const mantenimientosRouter = require('./routes/mantenimientos');
const productosBuffetRouter = require('./routes/productosBuffet');
const ventasBuffetRouter = require('./routes/ventasBuffet');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('Backend Club Sarmiento funcionando');
});

// --- ENDPOINTS DE RESERVAS ---
app.use('/reservas', reservasRouter);
app.use('/auth', authRouter);
app.use('/mantenimientos', mantenimientosRouter);
app.use('/productos_buffet', productosBuffetRouter);
app.use('/ventas_buffet', ventasBuffetRouter);

// Aquí irá la lógica de login y admins

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});