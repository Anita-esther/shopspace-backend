const pool = require('../config/db');

// GET /api/admin/stats
async function getStats(req, res) {
  try {
    const [[userCounts]] = await pool.query(
      `SELECT COUNT(*) AS total_users,
              SUM(status = 'suspended') AS suspended_users
       FROM users`
    );
    const [[productCounts]] = await pool.query(
      `SELECT COUNT(*) AS total_products,
              SUM(status = 'available') AS available_products,
              SUM(status = 'sold') AS sold_products
       FROM products`
    );
    const [[transactionCounts]] = await pool.query(
      `SELECT SUM(status = 'completed') AS completed_transactions
       FROM transactions`
    );

    res.json({
      status: 'ok',
      stats: {
        total_users: userCounts.total_users,
        suspended_users: userCounts.suspended_users || 0,
        total_products: productCounts.total_products,
        available_products: productCounts.available_products || 0,
        sold_products: productCounts.sold_products || 0,
        completed_transactions: transactionCounts.completed_transactions || 0,
      },
    });
  } catch (err) {
    console.error('Get admin stats error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch dashboard stats' });
  }
}

// GET /api/admin/users
// Optional query params: search (name/email), status
async function getAllUsers(req, res) {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT user_id, full_name, email, phone_number, matric_number, role, status, created_at
      FROM users
      WHERE 1 = 1
    `;
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', users: rows });
  } catch (err) {
    console.error('Get all users error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch users' });
  }
}

// PUT /api/admin/users/:id/status
// Body: { status: 'active' | 'suspended' }
async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ status: 'error', message: "status must be 'active' or 'suspended'" });
    }
    if (Number(id) === req.user.userId) {
      return res.status(400).json({ status: 'error', message: 'You cannot change your own account status' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [id]);
    const targetUser = rows[0];
    if (!targetUser) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    if (targetUser.role === 'admin') {
      return res.status(400).json({ status: 'error', message: 'Admin accounts cannot be suspended here' });
    }

    await pool.query('UPDATE users SET status = ? WHERE user_id = ?', [status, id]);
    res.json({ status: 'ok', message: `User ${status === 'suspended' ? 'suspended' : 'reactivated'}` });
  } catch (err) {
    console.error('Update user status error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to update user status' });
  }
}

// GET /api/admin/products
// All listings regardless of status, with seller info. Optional query params: search, status
async function getAllProducts(req, res) {
  try {
    const { search, status } = req.query;

    let query = `
      SELECT p.*, c.name AS category_name, u.full_name AS seller_name, u.email AS seller_email
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      JOIN users u ON p.seller_id = u.user_id
      WHERE 1 = 1
    `;
    const params = [];

    if (search) {
      query += ' AND (p.title LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.created_at DESC LIMIT 200';

    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', products: rows });
  } catch (err) {
    console.error('Get all products (admin) error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch listings' });
  }
}

module.exports = {
  getStats,
  getAllUsers,
  updateUserStatus,
  getAllProducts,
};
