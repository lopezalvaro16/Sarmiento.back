const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const SECRET = 'club_sarmiento_secreto';

// Manejar peticiones OPTIONS (preflight CORS) para /login
router.options('/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24 horas
  res.sendStatus(200);
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Log de inicio de request
  console.log('=== LOGIN REQUEST START ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('IP:', req.ip || req.connection.remoteAddress);
  console.log('User-Agent:', req.get('User-Agent'));
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body recibido:', { username, password: password ? '[HIDDEN]' : 'undefined' });
  
  try {
    console.log('Iniciando proceso de login para usuario:', username);
    
    // Verificar conexión a base de datos
    console.log('Verificando conexión a base de datos...');
    const dbTest = await pool.query('SELECT 1 as test');
    console.log('Conexión DB OK:', dbTest);
    
    // Buscar usuario
    console.log('Buscando usuario en base de datos...');
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    console.log('Resultado query:', result);
    
    const user = (result.rows || result)[0];
    console.log('Usuario encontrado:', user ? 'SÍ' : 'NO');
    
    if (!user) {
      console.log('❌ Usuario no encontrado:', username);
      console.log('=== LOGIN REQUEST END (FAILED) ===');
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    
    console.log('Usuario encontrado:', { id: user.id, username: user.username, role: user.role });
    
    // Verificar contraseña
    console.log('Verificando contraseña...');
    const passwordMatch = bcrypt.compareSync(password, user.password);
    console.log('Password match:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('❌ Contraseña incorrecta para usuario:', username);
      console.log('=== LOGIN REQUEST END (FAILED) ===');
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    
    // Generar token
    console.log('Generando token JWT...');
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '8h' });
    console.log('Token generado exitosamente');
    
    console.log('✅ Login exitoso para usuario:', username);
    console.log('=== LOGIN REQUEST END (SUCCESS) ===');
    
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('❌ ERROR EN LOGIN:', err);
    console.error('Stack trace:', err.stack);
    console.log('=== LOGIN REQUEST END (ERROR) ===');
    res.status(500).json({ error: 'Error de base de datos' });
  }
});

module.exports = router; 