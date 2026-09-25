const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Definición interna del Modelo 'User' (Evita el error MODULE_NOT_FOUND)
const User = mongoose.models.User || mongoose.model('user', new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  role: { type: String, default: 'Técnico de Reparaciones' },
  jobTitle: { type: String, default: 'Pendiente de Asignación' },
  status: { type: String, default: 'PENDING_APPROVAL' },
  isApproved: { type: Boolean, default: false },
  password: { type: String, required: true },
  createdAt: { type: Number, default: Date.now }
}));

// REGISTRO DE USUARIOS (EN PAUSA)
router.post('/register', async (req, res) => {
  try {
    const fullName = req.body.fullName || req.body.name || 'Usuario Taller';
    const { email, phone, role, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password || '1234', 10);

    const newUser = new User({
      fullName,
      email,
      phone: phone || '',
      role: role || 'Técnico de Reparaciones',
      password: hashedPassword,
      status: 'PENDING_APPROVAL',
      isApproved: false,
      jobTitle: 'Pendiente de Asignación'
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

// LOGIN (BLOQUEO DE USUARIOS EN PAUSA)
router.post('/login', async (req, res) => {
  try {
    const emailToFind = req.body.emailOrUser || req.body.email;
    const { password } = req.body;

    const user = await User.findOne({ email: emailToFind });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta está en revisión por el Administrador. Recibirás un correo cuando sea aprobada.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales o contraseña incorrecta.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'consolefixSecret', { expiresIn: '7d' });

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
