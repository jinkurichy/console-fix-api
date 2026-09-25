const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Aprobar usuario
router.put('/:id/approve', async (req, res) => {
  try {
    const { jobTitle } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

    user.status = 'ACTIVE';
    user.isApproved = true;
    user.jobTitle = jobTitle || user.jobTitle;

    await user.save();
    res.json({ message: 'Usuario aprobado correctamente.', user });
  } catch (error) {
    res.status(500).json({ error: 'Error al aprobar usuario.' });
  }
});

module.exports = router;
