const pool = require('../config/db');

// POST /api/reviews
// Leave a review on a completed transaction. The reviewer must be the buyer
// or seller on that transaction; the reviewee is automatically the other
// party. One review per (transaction, reviewer) — enforced here in app
// logic rather than a DB constraint, since we can't assume one exists.
// Body: { transaction_id, rating, comment }
async function createReview(req, res) {
  try {
    const reviewerId = req.user.userId;
    const { transaction_id, rating, comment } = req.body;

    if (!transaction_id || rating === undefined) {
      return res.status(400).json({ status: 'error', message: 'transaction_id and rating are required' });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ status: 'error', message: 'rating must be a whole number from 1 to 5' });
    }

    const [txRows] = await pool.query('SELECT * FROM transactions WHERE transaction_id = ?', [transaction_id]);
    const transaction = txRows[0];

    if (!transaction) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }
    if (transaction.buyer_id !== reviewerId && transaction.seller_id !== reviewerId) {
      return res.status(403).json({ status: 'error', message: 'You are not part of this transaction' });
    }
    if (transaction.status !== 'completed') {
      return res.status(400).json({ status: 'error', message: 'You can only review completed transactions' });
    }

    const revieweeId = transaction.buyer_id === reviewerId ? transaction.seller_id : transaction.buyer_id;

    const [existing] = await pool.query(
      'SELECT review_id FROM reviews WHERE transaction_id = ? AND reviewer_id = ?',
      [transaction_id, reviewerId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'You already reviewed this transaction' });
    }

    const [result] = await pool.query(
      `INSERT INTO reviews (transaction_id, reviewer_id, reviewee_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [transaction_id, reviewerId, revieweeId, ratingNum, comment || null]
    );

    const [rows] = await pool.query('SELECT * FROM reviews WHERE review_id = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: 'Review submitted', review: rows[0] });
  } catch (err) {
    console.error('Create review error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to submit review' });
  }
}

// GET /api/reviews/user/:userId
// A user's received reviews plus their average rating. Public (no auth) —
// same visibility level as browsing products/sellers.
async function getReviewsForUser(req, res) {
  try {
    const { userId } = req.params;

    const [rows] = await pool.query(
      `SELECT r.*, u.full_name AS reviewer_name
       FROM reviews r
       JOIN users u ON u.user_id = r.reviewer_id
       WHERE r.reviewee_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const count = rows.length;
    const average = count > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / count : null;

    res.json({
      status: 'ok',
      reviews: rows,
      average_rating: average !== null ? Math.round(average * 10) / 10 : null,
      review_count: count,
    });
  } catch (err) {
    console.error('Get reviews for user error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch reviews' });
  }
}

module.exports = {
  createReview,
  getReviewsForUser,
};
