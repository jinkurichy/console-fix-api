const express = require('express');
const cors = require('cors');
const path = require('path'); // 👈 Módulo nativo para manejar rutas de carpetas
require('dotenv').config();

const { initDatabase } = require('./db');
const ticketsRouter = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Servir los archivos estáticos de la carpeta web-portal (HTML, imágenes, CSS)
app.use(express.static(path.join(__dirname, 'web-portal')));

// 2. Rutas de la API de tickets
app.use('/api/tickets', ticketsRouter);

// 3. Ruta principal: Si la pide un navegador muestra el Portal Web, si la pide la App Android responde con el JSON de Healthcheck
app.get('/', (req, res) => {
  const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
  
  if (acceptsJson) {
    return res.json({
      app: 'ConsoleFix API',
      status: 'ONLINE 🚀',
      timestamp: new Date().toISOString()
    });
  }
  
  // Abrir el portal web de clientes en navegadores
  res.sendFile(path.join(__dirname, 'web-portal', 'index.html'));
});

// 4. Endpoint exclusivo para Healthcheck de la API
app.get('/api/health', (req, res) => {
  res.json({
    app: 'ConsoleFix API',
    status: 'ONLINE 🚀',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, async () => {
  console.log(`Servidor ConsoleFix corriendo en el puerto ${PORT}`);
  await initDatabase();
});
