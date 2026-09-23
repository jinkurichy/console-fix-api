const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool optimizado para Railway
const pool = mysql.createPool(
  process.env.MYSQL_URL || {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'iriguchi.proxy.rlwy.net',
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 32078),
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'railway',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
  }
);

// Crea la tabla automáticamente en Railway al encender el servidor
async function initDatabase() {
  try {
    console.log('Conectando a MySQL en Railway...');
    const connection = await pool.getConnection();
    console.log('¡Conexión a MySQL exitosa!');

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
        priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
        estimatedCost DOUBLE DEFAULT 0.0,
        advancePayment DOUBLE DEFAULT 0.0,
        warrantyDays INT DEFAULT 90,
        createdAt BIGINT NOT NULL,
        updatedAt BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Tabla `repair_tickets` lista en Railway.');
    connection.release();
  } catch (error) {
    console.error('Error al iniciar base de datos MySQL:', error.message);
  }
}

module.exports = { pool, initDatabase };
