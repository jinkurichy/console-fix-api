const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // Conexión a MySQL en Railway

// REGISTRO DE USUARIO EN MYSQL (EN PAUSA)
router.post('/register', async (req, res) => {
  try {
    const fullName = req.body.fullName || req.body.name || 'Usuario Taller';
    const email = req.body.email;
    const phone = req.body.phone || '';
    const role = req.body.role || 'Técnico de Reparaciones';
    const password = req.body.password || '1234';

    if (!email) {
      return res.status(400).json({ success: false, message: 'El correo es requerido.' });
    }

    // Verificar si el correo ya existe en la tabla 'users' de MySQL
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();

    // Insertar en la tabla 'users' de MySQL
    await db.query(
      `INSERT INTO users (full_name, email, phone, role, job_title, status, password, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone, role, 'Pendiente de Asignación', 'PENDING_APPROVAL', hashedPassword, new Date()]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito en MySQL, pendiente de aprobación.',
      user: { id: userId, fullName, email, phone, role, jobTitle: 'Pendiente de Asignación', status: 'PENDING_APPROVAL' }
    });
  } catch (error) {
    console.error('Error en registro MySQL:', error);
    res.status(500).json({ success: false, message: 'Error interno al registrar usuario.' });
  }
});

// LOGIN EN MYSQL (BLOQUEO SI ESTÁ EN PAUSA)
router.post('/login', async (req, res) => {
  try {
    const emailToFind = req.body.emailOrUser || req.body.email;
    const password = req.body.password || '';

    const [rows] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [emailToFind]);
    const user = rows && rows[0] ? rows[0] : null;

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado en MySQL.' });
    }

    const userStatus = user.status || 'ACTIVE';
    if (userStatus.toUpperCase() === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está en revisión por el Administrador. Recibirás un correo cuando sea aprobada.'
      });
    }

    // Soporta contraseña encriptada bcrypt o texto plano
    let isMatch = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (user.password === password);
    }

    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales o contraseña incorrecta.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'consolefixSecret', { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user.id.toString(),
        fullName: user.full_name || user.fullName || user.email,
        email: user.email,
        phone: user.phone || '',
        role: user.role || 'admin',
        jobTitle: user.job_title || user.jobTitle || 'Administrador',
        status: userStatus
      }
    });
  } catch (error) {
    console.error('Error en login MySQL:', error);
    res.status(500).json({ success: false, message: 'Error interno al iniciar sesión.' });
  }
});

module.exports = router;
