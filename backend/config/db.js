
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),

    // TiDB Cloud requires a secure TLS connection
    ssl: {
        minVersion: 'TLSv1.2'
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('TiDB Cloud Database Connected Successfully!');
        connection.release();
    } catch (error) {
        console.error('Database Connection Failed:', error.message);
    }
}

module.exports = { pool, testConnection };
