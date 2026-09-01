const pool = require('../config/db');

// POST /api/transactions
// Buyer initiates a transaction on a product (records intent to buy at an agreed price)
// Body: { product_id, agreed_price }
async function createTransaction(req, res) {
  try {
    const buyerId = req.user.userId;
    const { product_id, agreed_price } = req.body;

    if (!product_id || !agreed_price) {
      return res.status(400).json({ status: 'error', message: 'product_id and agreed_price are required' });
    }

    const [productRows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [product_id]);
    const product = productRows[0];

    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    if (product.status !== 'available') {
      return res.status(400).json({ status: 'error', message: 'This item is no longer available' });
    }
    if (product.seller_id === buyerId) {
      return res.status(400).json({ status: 'error', message: 'You cannot buy your own listing' });
    }

    const [result] = await pool.query(
      `INSERT INTO transactions (product_id, buyer_id, seller_id, agreed_price, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [product_id, buyerId, product.seller_id, agreed_price]
    );

    const [rows] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: 'Transaction started', transaction: rows[0] });
  } catch (err) {
    console.error('Create transaction error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to start transaction' });
  }
}

// PUT /api/transactions/:id/complete
// Either party (buyer or seller) confirms the transaction happened.
// When completed, the product is marked as sold.
async function completeTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ?', [id]);
    const transaction = rows[0];

    if (!transaction) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }
    if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
      return res.status(403).json({ status: 'error', message: 'You are not part of this transaction' });
    }
    if (transaction.status !== 'pending') {
      return res.status(400).json({ status: 'error', message: `Transaction is already ${transaction.status}` });
    }

    await pool.query(`UPDATE transactions SET status = 'completed' WHERE transaction_id = ?`, [id]);
    await pool.query(`UPDATE products SET status = 'sold' WHERE product_id = ?`, [transaction.product_id]);

    const [updated] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ?', [id]);
    res.json({ status: 'ok', message: 'Transaction marked complete', transaction: updated[0] });
  } catch (err) {
    console.error('Complete transaction error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to complete transaction' });
  }
}

// PUT /api/transactions/:id/cancel
async function cancelTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ?', [id]);
    const transaction = rows[0];

    if (!transaction) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }
    if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
      return res.status(403).json({ status: 'error', message: 'You are not part of this transaction' });
    }
    if (transaction.status !== 'pending') {
      return res.status(400).json({ status: 'error', message: `Transaction is already ${transaction.status}` });
    }

    await pool.query(`UPDATE transactions SET status = 'cancelled' WHERE transaction_id = ?`, [id]);

    const [updated] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ?', [id]);
    res.json({ status: 'ok', message: 'Transaction cancelled', transaction: updated[0] });
  } catch (err) {
    console.error('Cancel transaction error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to cancel transaction' });
  }
}

// GET /api/transactions/mine
// All transactions where the current user is buyer or seller
async function getMyTransactions(req, res) {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `SELECT t.*,
              p.title AS product_title, p.image_url AS product_image_url,
              b.full_name AS buyer_name, s.full_name AS seller_name,
              (r.review_id IS NOT NULL) AS reviewed_by_me
       FROM transactions t
       JOIN products p ON p.product_id = t.product_id
       JOIN users b ON b.user_id = t.buyer_id
       JOIN users s ON s.user_id = t.seller_id
       LEFT JOIN reviews r ON r.transaction_id = t.transaction_id AND r.reviewer_id = ?
       WHERE t.buyer_id = ? OR t.seller_id = ?
       ORDER BY t.created_at DESC`,
      [userId, userId, userId]
    );

    res.json({ status: 'ok', transactions: rows });
  } catch (err) {
    console.error('Get my transactions error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch transactions' });
  }
}

// GET /api/transactions/:id
async function getTransactionById(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT t.*,
              p.title AS product_title, p.image_url AS product_image_url,
              b.full_name AS buyer_name, s.full_name AS seller_name
       FROM transactions t
       JOIN products p ON p.product_id = t.product_id
       JOIN users b ON b.user_id = t.buyer_id
       JOIN users s ON s.user_id = t.seller_id
       WHERE t.transaction_id = ?`,
      [id]
    );
    const transaction = rows[0];

    if (!transaction) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }
    if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
      return res.status(403).json({ status: 'error', message: 'You are not part of this transaction' });
    }

    res.json({ status: 'ok', transaction });
  } catch (err) {
    console.error('Get transaction error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch transaction' });
  }
}

module.exports = {
  createTransaction,
  completeTransaction,
  cancelTransaction,
  getMyTransactions,
  getTransactionById,
};
