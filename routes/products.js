const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
} = require('../controllers/productsController');
const { requireAuth } = require('../middleware/auth');

// IMPORTANT: /mine must come before /:id so it isn't swallowed as a product id
router.get('/mine', requireAuth, getMyProducts);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', requireAuth, createProduct);
router.put('/:id', requireAuth, updateProduct);
router.delete('/:id', requireAuth, deleteProduct);

module.exports = router;
