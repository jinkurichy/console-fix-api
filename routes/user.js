const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Modelo 'User' registrado en Mongoose
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
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

// LISTAR TODOS LOS USUARIOS (GET /api/users)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error al consultar usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al consultar lista de usuarios.' });
  }
});

// APROBAR USUARIO Y ASIGNAR PUESTO (PUT /api/users/:id/approve)
router.put('/:id/approve', async (req, res) => {
  try {
    const { jobTitle, role, status } = req.body;
    
    let user = await User.findById(req.params.id);
    if (!user) {
      user = await User.findOne({ email: req.params.id });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

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
