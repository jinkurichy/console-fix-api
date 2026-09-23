const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./db');
const ticketsRouter = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Healthcheck para probar que Railway está en línea
app.get('/', (req, res) => {
  res.json({
    app: 'ConsoleFix API',
    status: 'ONLINE 🚀',
    timestamp: new Date().toISOString()
  });
});

// Rutas de tickets
app.use('/api/tickets', ticketsRouter);

app.listen(PORT, async () => {
  console.log(`Servidor ConsoleFix corriendo en el puerto ${PORT}`);
  await initDatabase();
});
