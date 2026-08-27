const mysql = require('mysql2/promise');
require('dotenv').config();

// Connection pool to the HostGator MySQL database.
// Using a pool (not a single connection) so multiple requests
// can be handled concurrently without exhausting connections.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // HostGator remote MySQL sometimes requires SSL to be disabled/relaxed;
  // adjust this if your host requires SSL.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

module.exports = pool;
