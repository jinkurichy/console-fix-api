const express = require('express');
const router = express.Router();
const User = require('../models/User');

// ==========================================
// 1. OBTENER TODOS LOS USUARIOS Y PERSONAL
// ==========================================
// Endpoint que llama la app Android (GET /api/users) para listar al equipo
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Excluir la contraseña por seguridad
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al consultar la lista de usuarios.' });
  }
});

// ==========================================
// 2. APROBAR USUARIO Y ASIGNAR PUESTO
// ==========================================
// Endpoint que llama la app Android (PUT /api/users/:id/approve)
router.put('/:id/approve', async (req, res) => {
  try {
    const { jobTitle, role, status } = req.body;
    
    // Buscar usuario por ID o por Email
    let user = await User.findById(req.params.id);
    if (!user) {
      user = await User.findOne({ email: req.params.id });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    // Activar acceso y asignar puesto de trabajo
    user.status = status || 'ACTIVE';
    user.isApproved = true;
    user.jobTitle = jobTitle || user.jobTitle;
    if (role) user.role = role;

    await user.save();

    res.json({
      success: true,
      message: 'Usuario aprobado y puesto asignado correctamente.',
      user
    });
  } catch (error) {
    console.error('Error al aprobar usuario:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar usuario en el servidor.' });
  }
});

module.exports = router;
