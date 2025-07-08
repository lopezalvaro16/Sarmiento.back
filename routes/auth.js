const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const SECRET = 'club_sarmiento_secreto';

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    console.log('Intento de login:', username, password);
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
      console.log('Usuario no encontrado:', username);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const passwordMatch = bcrypt.compareSync(password, user.password);
    console.log('Password match:', passwordMatch);
    if (!passwordMatch) {
      console.log('Contraseña incorrecta para usuario:', username);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '8h' });
    console.log('Login exitoso:', username);
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error de base de datos' });
  }
});

module.exports = router; 