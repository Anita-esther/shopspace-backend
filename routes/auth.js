const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser, getUserById, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getCurrentUser);
router.put('/me', requireAuth, updateProfile);
router.get('/user/:id', requireAuth, getUserById);

module.exports = router;
