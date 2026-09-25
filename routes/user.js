const express = require('express');
const router = express.Router();
const db = require('../db');

// LISTAR USUARIOS (GET /api/users)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, full_name, email, phone, role, job_title, status FROM users');
    
    const mappedUsers = rows.map(u => {
      const jobTitle = u.job_title || 'Pendiente de Asignación';
      let status = u.status;
      // Si status está vacío o nulo pero su puesto es 'Pendiente', marcarlo como PENDING_APPROVAL
      if (!status || status === '') {
        status = jobTitle.includes('Pendiente') ? 'PENDING_APPROVAL' : 'ACTIVE';
      }

      return {
        id: u.id.toString(),
        fullName: u.full_name || u.email,
        email: u.email,
        phone: u.phone || '',
        role: u.role || 'Técnico de Reparaciones',
        jobTitle: jobTitle,
        status: status
      };
    });

    res.json(mappedUsers);
  } catch (error) {
    console.error('Error al consultar usuarios en MySQL:', error);
    res.status(500).json({ success: false, message: 'Error al consultar usuarios.' });
  }
});

// APROBAR USUARIO (PUT /api/users/:id/approve)
router.put('/:id/approve', async (req, res) => {
  try {
    const { jobTitle, role, status } = req.body;
    const identifier = req.params.id;

    await db.query(
      `UPDATE users SET status = ?, job_title = ?, role = ? WHERE id = ? OR email = ?`,
      [status || 'ACTIVE', jobTitle || 'Técnico', role || 'Técnico de Reparaciones', identifier, identifier]
    );

    res.json({ success: true, message: 'Usuario aprobado en MySQL.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al aprobar usuario.' });
  }
});

// DENEGAR USUARIO (DELETE /api/users/:id)
router.delete('/:id', async (req, res) => {
  try {
    const identifier = req.params.id;
    await db.query('DELETE FROM users WHERE id = ? OR email = ?', [identifier, identifier]);
    res.json({ success: true, message: 'Solicitud eliminada en MySQL.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar usuario.' });
  }
});

module.exports = router;
