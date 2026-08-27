const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Simple liveness check - confirms the server is running
router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'ShopSpace API is running' });
});

// DB check - confirms Render can actually reach the HostGator MySQL database
router.get('/db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ status: 'ok', message: 'Database connection successful', result: rows[0].result });
  } catch (err) {
    console.error('Database connection error:', err.message);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

module.exports = router;
