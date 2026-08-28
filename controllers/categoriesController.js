const pool = require('../config/db');

// GET /api/categories
async function getCategories(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ status: 'ok', categories: rows });
  } catch (err) {
    console.error('Get categories error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch categories' });
  }
}

module.exports = { getCategories };
