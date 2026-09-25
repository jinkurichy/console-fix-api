const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. REGISTRO DE USUARIO (CON ESTADO EN PAUSA)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    // Soportar campos de la App Android ('fullName' y 'phone')
    const fullName = req.body.fullName || req.body.name || 'Usuario Taller';
    const { email, phone, role, password } = req.body;

    // Verificar si el correo ya está registrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password || '1234', 10);

    // Crear el nuevo usuario en estado PENDING_APPROVAL (En Pausa)
    const newUser = new User({
      fullName,
      email,
      phone: phone || '',
      role: role || 'Técnico de Reparaciones',
      password: hashedPassword,
      status: 'PENDING_APPROVAL',       // 👈 En pausa por defecto
      isApproved: false,
      jobTitle: 'Pendiente de Asignación' // 👈 Puesto pendiente
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito, pendiente de aprobación por el Administrador.',
      user: newUser
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: 'Error interno al registrar usuario.' });
  }
});

// ==========================================
// 2. INICIO DE SESIÓN (BLOQUEO SI ESTÁ EN PAUSA)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    // Soportar campo 'emailOrUser' enviado por la App Android
    const emailToFind = req.body.emailOrUser || req.body.email;
    const { password } = req.body;

    const user = await User.findOne({ email: emailToFind });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    // 🛑 BLOQUEO DE ACCESO: Si la cuenta está pendiente de aprobación por el Admin
    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está en revisión por el Administrador. Recibirás un correo cuando sea aprobada.'
      });
    }

    // Verificar contraseña encriptada
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales o contraseña incorrecta.' });
    }

    // Generar Token JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'consolefixSecret', { expiresIn: '7d' });

    // Respuesta de éxito para la App Android
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName || user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        jobTitle: user.jobTitle,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno al iniciar sesión.' });
  }
});

module.exports = router;
