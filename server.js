const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./db');

// Importar los archivos en minúsculas exactamente
const authRouter = require('./routes/auth');
const ticketsRouter = require('./routes/tickets');
const userRouter = require('./routes/user'); // 👈 Apunta a routes/user.js en minúsculas

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Portal Web de Clientes
app.use(express.static(path.join(__dirname, 'web-portal')));

// Rutas de la API (Acepta tanto /api/users como /api/user)
app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', userRouter);
app.use('/api/user', userRouter);

// Vista Web / Healthcheck
app.get('/', (req, res) => {
  const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
  if (acceptsJson) {
    return res.json({ app: 'ConsoleFix API', status: 'ONLINE 🚀', timestamp: new Date().toISOString() });
  }
  res.sendFile(path.join(__dirname, 'web-portal', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ app: 'ConsoleFix API', status: 'ONLINE 🚀', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor ConsoleFix corriendo en el puerto ${PORT}`);
  await initDatabase();
});
