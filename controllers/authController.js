const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { userId: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Strips sensitive fields before sending a user object back to the client
function toPublicUser(user) {
  const { password_hash, ...publicUser } = user;
  return publicUser;
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { full_name, email, password, phone_number, matric_number } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ status: 'error', message: 'full_name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
    }

    // Check for existing account with this email
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ status: 'error', message: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, matric_number)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, email, password_hash, phone_number || null, matric_number || null]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [result.insertId]);
    const newUser = rows[0];
    const token = signToken(newUser);

    res.status(201).json({
      status: 'ok',
      message: 'Account created successfully',
      token,
      user: toPublicUser(newUser)
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ status: 'error', message: 'Something went wrong during registration' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Email and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ status: 'error', message: 'This account has been suspended' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const token = signToken(user);

    res.json({
      status: 'ok',
      message: 'Logged in successfully',
      token,
      user: toPublicUser(user)
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ status: 'error', message: 'Something went wrong during login' });
  }
}

// GET /api/auth/me  (requires auth middleware)
async function getCurrentUser(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [req.user.userId]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    res.json({ status: 'ok', user: toPublicUser(user) });
  } catch (err) {
    console.error('Get current user error:', err.message);
    res.status(500).json({ status: 'error', message: 'Something went wrong' });
  }
}

module.exports = { register, login, getCurrentUser };
