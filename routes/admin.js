const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, updateUserStatus, getAllProducts } = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/products', getAllProducts);

module.exports = router;
