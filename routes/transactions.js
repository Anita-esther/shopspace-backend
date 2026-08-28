const express = require('express');
const router = express.Router();
const {
  createTransaction,
  completeTransaction,
  cancelTransaction,
  getMyTransactions,
  getTransactionById,
} = require('../controllers/transactionsController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth); // every transactions route requires login

// IMPORTANT: /mine must come before /:id so it isn't swallowed as a transaction id
router.get('/mine', getMyTransactions);

router.get('/:id', getTransactionById);
router.post('/', createTransaction);
router.put('/:id/complete', completeTransaction);
router.put('/:id/cancel', cancelTransaction);

module.exports = router;
