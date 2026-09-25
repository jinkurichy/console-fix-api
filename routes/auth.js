const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      status: 'PENDING_APPROVAL',
      isApproved: false,
      jobTitle: 'Pendiente de Asignación'
    });

    await newUser.save();
    res.status(201).json({ message: 'Usuario registrado, pendiente de aprobación.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({ error: 'Tu cuenta está en revisión por el Administrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Credenciales inválidas.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión.' });
  }
});

module.exports = router;
