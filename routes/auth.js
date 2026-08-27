const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getCurrentUser);

module.exports = router;
