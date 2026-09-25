const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Módulos locales de la Base de Datos y Módulos de Rutas de la API
const { initDatabase } = require('./db');
const authRouter = require('./routes/auth');       // Rutas: POST /api/auth/login, POST /api/auth/register
const ticketsRouter = require('./routes/tickets'); // Rutas: GET, POST, PUT, DELETE /api/tickets
const usersRouter = require('./routes/users');     // Rutas: GET /api/users, PUT /api/users/:id/approve

const app = express();
const PORT = process.env.PORT || 3000;

// =========================================================================
// MIDDLEWARES DE CONFIGURACIÓN
// =========================================================================

// Habilitar CORS para permitir solicitudes desde la App Android o navegadores externos
app.use(cors());

// Habilitar lectura de payloads JSON en peticiones HTTP (límite máximo de 10MB)
app.use(express.json({ limit: '10mb' }));

// Middleware de Rastreo / Logging: Imprime cada petición HTTP entrante en la consola de Railway
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] 📩 ${req.method} ${req.url}`);
  next();
});

// =========================================================================
// 1. PORTAL WEB DE CLIENTES (Archivos Estáticos)
// =========================================================================
// Sirve automáticamente index.html y recursos de la carpeta 'web-portal'
app.use(express.static(path.join(__dirname, 'web-portal')));

// =========================================================================
// 2. RUTAS DE LA API REST (Conexión con la App Android)
// =========================================================================

// Módulo de Autenticación (Login / Registro con estado en pausa)
app.use('/api/auth', authRouter);

// Módulo de Gestión de Tickets de Reparación de Consolas
app.use('/api/tickets', ticketsRouter);

// Módulo de Gestión y Aprobación de Personal del Taller
app.use('/api/users', usersRouter);

// =========================================================================
// 3. RUTA RAÍZ Y HEALTHCHECK DE DIAGNÓSTICO
// =========================================================================

// Ruta Raíz ('/'):
// - Si se accede desde un navegador web ➔ Muestra el Portal Web de Clientes
// - Si se accede desde Retrofit / App Android ➔ Responde con el estado del servidor en JSON
app.get('/', (req, res) => {
  const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
  
  if (acceptsJson) {
    return res.json({
      app: 'ConsoleFix API',
      status: 'ONLINE 🚀',
      timestamp: new Date().toISOString()
    });
  }
  
  // Abrir Portal Web
  res.sendFile(path.join(__dirname, 'web-portal', 'index.html'));
});

// Endpoint exclusivo para pruebas de salud del servidor (Healthcheck)
app.get('/api/health', (req, res) => {
  res.json({
    app: 'ConsoleFix API',
    status: 'ONLINE 🚀',
    timestamp: new Date().toISOString()
  });
});

// =========================================================================
// 4. MANEJO DE ERRORES Y DIAGNÓSTICO DE FALLOS
// =========================================================================

// Manejador para Rutas No Encontradas (Error 404)
app.use((req, res) => {
  console.warn(`⚠️ RUTA NO ENCONTRADA (404): ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Ruta no encontrada en el servidor API',
    method: req.method,
    url: req.url
  });
});

// Manejador Global para Errores Internos del Servidor (Error 500)
// Muestra el detalle exacto del error en la consola de Railway para fácil depuración
app.use((err, req, res, next) => {
  console.error('❌ ERROR INTERNO DEL SERVIDOR (500):', err.stack || err.message || err);
  res.status(500).json({
    error: 'Error interno del servidor en Railway',
    details: err.message || 'Error desconocido en ejecución'
  });
});

// =========================================================================
// 5. ARRANQUE DEL SERVIDOR Y CONEXIÓN A BASE DE DATOS
// =========================================================================
app
