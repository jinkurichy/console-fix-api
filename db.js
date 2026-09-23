const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración con tu host y puerto de Railway: iriguchi.proxy.rlwy.net:32078
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'iriguchi.proxy.rlwy.net',
  port: Number(process.env.DB_PORT || 32078),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Crea automáticamente la tabla en tu MySQL de Railway al iniciar la API
async function initDatabase() {
  try {
    console.log('Conectando a MySQL en iriguchi.proxy.rlwy.net:32078 ...');
    const connection = await pool.getConnection();
    console.log('¡Conexión exitosa a tu base de datos en Railway!');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS repair_tickets (
        id VARCHAR(64) PRIMARY KEY,
        ticketNumber VARCHAR(32) NOT NULL,
        clientName VARCHAR(150) NOT NULL,
        clientPhone VARCHAR(50) NOT NULL,
        clientEmail VARCHAR(150) DEFAULT '',
        consoleBrand VARCHAR(50) NOT NULL,
        consoleModel VARCHAR(100) NOT NULL,
        serialNumber VARCHAR(100) DEFAULT '',
        issueCategory VARCHAR(50) NOT NULL,
        issueDescription TEXT NOT NULL,
        diagnosticNotes TEXT,
        accessoriesIncluded TEXT,
        partsRequired TEXT,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        estimatedCost DOUBLE DEFAULT 0.0,
        advancePayment DOUBLE DEFAULT 0.0,
        warrantyDays INT DEFAULT 90,
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Tabla `repair_tickets` creada/verificada en MySQL de Railway.');
    connection.release();
  } catch (error) {
    console.error('Error al conectar con MySQL de Railway:', error.message);
  }
}

module.exports = { pool, initDatabase };
