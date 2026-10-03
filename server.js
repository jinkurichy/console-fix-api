const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./db');

const authRouter = require('./routes/auth');
const ticketsRouter = require('./routes/tickets');
const userRouter = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'web-portal')));

app.use('/api/auth', authRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/users', userRouter);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    app: 'ConsoleFix API',
    status: 'ONLINE',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'web-portal', 'index.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Ruta de API no encontrada'
  });
});

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 ConsoleFix API escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar ConsoleFix API:', error);
    process.exit(1);
  }
}

startServer();