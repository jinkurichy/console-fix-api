const express = require('express');
const router = express.Router();
const db = require('../db'); // Conexión a MySQL en Railway

// LISTAR TODOS LOS USUARIOS DESDE MYSQL (GET /api/users)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, full_name, email, phone, role, job_title, status FROM users');
    
    // Convertir nombres de columnas de MySQL (full_name) a formato Android (fullName)
    const mappedUsers = rows.map(u => ({
      id: u.id.toString(),
      fullName: u.full_name || u.email,
      email: u.email,
      phone: u.phone || '',
      role: u.role || 'Técnico de Reparaciones',
      jobTitle: u.job_title || 'Pendiente de Asignación',
      status: u.status || 'ACTIVE'
    }));

    res.json(mappedUsers);
  } catch (error) {
    console.error('Error al consultar usuarios en MySQL:', error);
    res.status(500).json({ success: false, message: 'Error al consultar lista de usuarios en MySQL.' });
  }
});

// APROBAR USUARIO EN MYSQL (PUT /api/users/:id/approve)
router.put('/:id/approve', async (req, res) => {
  try {
    const { jobTitle, role, status } = req.body;
    const identifier = req.params.id;

    await db.query(
      `UPDATE users 
       SET status = ?, job_title = ?, role = ? 
       WHERE id = ? OR email = ?`,
      [status || 'ACTIVE', jobTitle || 'Técnico', role || 'Técnico de Reparaciones', identifier, identifier]
    );

    res.json({
      success: true,
      message: 'Usuario aprobado y puesto asignado correctamente en MySQL.'
    });
  } catch (error) {
    console.error('Error al aprobar usuario en MySQL:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar usuario en MySQL.' });
  }
});

// DENEGAR / ELIMINAR USUARIO EN MYSQL (DELETE /api/users/:id)
router.delete('/:id', async (req, res) => {
  try {
    const identifier = req.params.id;
    await db.query('DELETE FROM users WHERE id = ? OR email = ?', [identifier, identifier]);

    res.json({
      success: true,
      message: 'Solicitud eliminada/denegada correctamente en MySQL.'
    });
  } catch (error) {
    console.error('Error al eliminar usuario en MySQL:', error);
    res.status(500).json({ success: false, message: 'Error al denegar usuario en MySQL.' });
  }
});

module.exports = router;
