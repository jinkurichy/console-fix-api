const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/tickets - Listar todas las órdenes
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM repair_tickets ORDER BY updatedAt DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/tickets error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id - Obtener una orden por ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM repair_tickets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets - Crear orden individual
router.post('/', async (req, res) => {
  try {
    const t = req.body;
    const now = Date.now();
    const query = `
      INSERT INTO repair_tickets 
      (id, ticketNumber, clientName, clientPhone, clientEmail, consoleBrand, consoleModel, 
       serialNumber, issueCategory, issueDescription, diagnosticNotes, accessoriesIncluded, 
       partsRequired, status, priority, estimatedCost, advancePayment, warrantyDays, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ticketNumber=VALUES(ticketNumber), clientName=VALUES(clientName), clientPhone=VALUES(clientPhone),
        clientEmail=VALUES(clientEmail), consoleBrand=VALUES(consoleBrand), consoleModel=VALUES(consoleModel),
        serialNumber=VALUES(serialNumber), issueCategory=VALUES(issueCategory), issueDescription=VALUES(issueDescription),
        diagnosticNotes=VALUES(diagnosticNotes), accessoriesIncluded=VALUES(accessoriesIncluded),
        partsRequired=VALUES(partsRequired), status=VALUES(status), priority=VALUES(priority),
        estimatedCost=VALUES(estimatedCost), advancePayment=VALUES(advancePayment),
        warrantyDays=VALUES(warrantyDays), updatedAt=VALUES(updatedAt)
    `;
    await pool.query(query, [
      String(t.id), t.ticketNumber || '', t.clientName || '', t.clientPhone || '', t.clientEmail || '',
      t.consoleBrand || '', t.consoleModel || '', t.serialNumber || '', t.issueCategory || '',
      t.issueDescription || '', t.diagnosticNotes || '', t.accessoriesIncluded || '',
      t.partsRequired || '', t.status || 'Recibido', t.priority || 'Normal',
      Number(t.estimatedCost) || 0, Number(t.advancePayment) || 0,
      Number(t.warrantyDays) || 90, Number(t.createdAt) || now, Number(t.updatedAt) || now
    ]);
    res.status(201).json({ success: true, message: 'Orden guardada', id: t.id });
  } catch (err) {
    console.error('POST /api/tickets error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tickets/:id - Actualizar orden
router.put('/:id', async (req, res) => {
  try {
    const t = req.body;
    const now = Date.now();
    const query = `
      UPDATE repair_tickets SET
        ticketNumber = ?, clientName = ?, clientPhone = ?, clientEmail = ?, consoleBrand = ?,
        consoleModel = ?, serialNumber = ?, issueCategory = ?, issueDescription = ?,
        diagnosticNotes = ?, accessoriesIncluded = ?, partsRequired = ?, status = ?,
        priority = ?, estimatedCost = ?, advancePayment = ?, warrantyDays = ?, updatedAt = ?
      WHERE id = ?
    `;
    await pool.query(query, [
      t.ticketNumber, t.clientName, t.clientPhone, t.clientEmail || '', t.consoleBrand,
      t.consoleModel, t.serialNumber || '', t.issueCategory, t.issueDescription,
      t.diagnosticNotes || '', t.accessoriesIncluded || '', t.partsRequired || '',
      t.status, t.priority, Number(t.estimatedCost) || 0, Number(t.advancePayment) || 0,
      Number(t.warrantyDays) || 90, now, req.params.id
    ]);
    res.json({ success: true, message: 'Orden actualizada' });
  } catch (err) {
    console.error('PUT /api/tickets/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tickets/:id - Eliminar orden
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM repair_tickets WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Orden eliminada' });
  } catch (err) {
    console.error('DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/sync - Sincronización masiva con la App
router.post('/sync', async (req, res) => {
  try {
    const { localTickets } = req.body;
    if (Array.isArray(localTickets) && localTickets.length > 0) {
      for (const t of localTickets) {
        await pool.query(`
          INSERT INTO repair_tickets 
          (id, ticketNumber, clientName, clientPhone, clientEmail, consoleBrand, consoleModel, 
           serialNumber, issueCategory, issueDescription, diagnosticNotes, accessoriesIncluded, 
           partsRequired, status, priority, estimatedCost, advancePayment, warrantyDays, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            ticketNumber=VALUES(ticketNumber), clientName=VALUES(clientName), clientPhone=VALUES(clientPhone),
            clientEmail=VALUES(clientEmail), consoleBrand=VALUES(consoleBrand), consoleModel=VALUES(consoleModel),
            serialNumber=VALUES(serialNumber), issueCategory=VALUES(issueCategory), issueDescription=VALUES(issueDescription),
            diagnosticNotes=VALUES(diagnosticNotes), accessoriesIncluded=VALUES(accessoriesIncluded),
            partsRequired=VALUES(partsRequired), status=VALUES(status), priority=VALUES(priority),
            estimatedCost=VALUES(estimatedCost), advancePayment=VALUES(advancePayment),
            warrantyDays=VALUES(warrantyDays), updatedAt=VALUES(updatedAt)
        `, [
          String(t.id), t.ticketNumber || '', t.clientName || '', t.clientPhone || '', t.clientEmail || '',
          t.consoleBrand || '', t.consoleModel || '', t.serialNumber || '', t.issueCategory || '',
          t.issueDescription || '', t.diagnosticNotes || '', t.accessoriesIncluded || '',
          t.partsRequired || '', t.status || 'Recibido', t.priority || 'Normal',
          Number(t.estimatedCost) || 0, Number(t.advancePayment) || 0,
          Number(t.warrantyDays) || 90, Number(t.createdAt), Number(t.updatedAt)
        ]);
      }
    }

    // Devuelve todos los tickets consolidados
    const [allTickets] = await pool.query('SELECT * FROM repair_tickets ORDER BY updatedAt DESC');
    res.json({ success: true, count: allTickets.length, tickets: allTickets });
  } catch (err) {
    console.error('POST /api/tickets/sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
