const pool = require('../config/db');

// GET /api/messages/conversations
// Returns one row per person the current user has exchanged messages with,
// with the last message and an unread count — built from the messages table
// directly since we don't have a separate conversations table.
async function getConversations(req, res) {
  try {
    const userId = req.user.userId;

    const [rows] = await pool.query(
      `
      SELECT
        other.user_id AS other_user_id,
        other.full_name AS other_full_name,
        other.profile_image AS other_avatar_url,
        lm.message_text AS last_message,
        lm.created_at AS last_message_at,
        lp.product_id AS product_id,
        lp.title AS product_title,
        lp.image_url AS product_image_url,
        (
          SELECT COUNT(*) FROM messages m2
          WHERE m2.sender_id = other.user_id
            AND m2.receiver_id = ?
            AND m2.is_read = FALSE
        ) AS unread_count
      FROM (
        SELECT
          CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_user_id,
          MAX(message_id) AS last_message_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY other_user_id
      ) AS convo
      JOIN users other ON other.user_id = convo.other_user_id
      JOIN messages lm ON lm.message_id = convo.last_message_id
      LEFT JOIN products lp ON lp.product_id = lm.product_id
      ORDER BY lm.created_at DESC
      `,
      [userId, userId, userId, userId]
    );

    res.json({ status: 'ok', conversations: rows });
  } catch (err) {
    console.error('Get conversations error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch conversations' });
  }
}

// GET /api/messages/:otherUserId
// Fetches the message thread between the current user and otherUserId,
// marks incoming messages as read, and includes the most recently
// referenced product (if any) so the UI can show what the chat is about.
async function getThread(req, res) {
  try {
    const userId = req.user.userId;
    const otherUserId = Number(req.params.otherUserId);

    const [rows] = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC
       LIMIT 500`,
      [userId, otherUserId, otherUserId, userId]
    );

    // Mark messages from the other user as read
    await pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
      [otherUserId, userId]
    );

    // Find the most recently referenced product in this thread, so the
    // chat can show a "regarding this item" banner even a few messages in.
    const [productRows] = await pool.query(
      `SELECT p.product_id, p.title, p.price, p.image_url
       FROM messages m
       JOIN products p ON p.product_id = m.product_id
       WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
         AND m.product_id IS NOT NULL
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [userId, otherUserId, otherUserId, userId]
    );

    res.json({
      status: 'ok',
      messages: rows,
      product: productRows[0] || null,
    });
  } catch (err) {
    console.error('Get thread error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch messages' });
  }
}

// POST /api/messages
// Body: { receiver_id, message_text, product_id? }
async function sendMessage(req, res) {
  try {
    const { receiver_id, message_text, product_id } = req.body;
    const senderId = req.user.userId;

    if (!receiver_id || !message_text || !message_text.trim()) {
      return res.status(400).json({ status: 'error', message: 'receiver_id and message_text are required' });
    }
    if (Number(receiver_id) === senderId) {
      return res.status(400).json({ status: 'error', message: 'You cannot message yourself' });
    }

    const [result] = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, product_id, message_text)
       VALUES (?, ?, ?, ?)`,
      [senderId, receiver_id, product_id || null, message_text.trim()]
    );

    const [rows] = await pool.query('SELECT * FROM messages WHERE message_id = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: rows[0] });
  } catch (err) {
    console.error('Send message error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to send message' });
  }
}

module.exports = { getConversations, getThread, sendMessage };
