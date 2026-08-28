const pool = require('../config/db');

// GET /api/products
// Supports optional query params: search, category_id, min_price, max_price, condition
async function getProducts(req, res) {
  try {
    const { search, category_id, min_price, max_price, condition } = req.query;

    let query = `
      SELECT p.*, c.name AS category_name, u.full_name AS seller_name
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      JOIN users u ON p.seller_id = u.user_id
      WHERE p.status = 'available'
    `;
    const params = [];

    if (search) {
      query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }
    if (min_price) {
      query += ' AND p.price >= ?';
      params.push(min_price);
    }
    if (max_price) {
      query += ' AND p.price <= ?';
      params.push(max_price);
    }
    if (condition) {
      query += ' AND p.condition = ?';
      params.push(condition);
    }

    query += ' ORDER BY p.created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', products: rows });
  } catch (err) {
    console.error('Get products error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch products' });
  }
}

// GET /api/products/:id
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name, u.full_name AS seller_name, u.phone_number AS seller_phone
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       JOIN users u ON p.seller_id = u.user_id
       WHERE p.product_id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    res.json({ status: 'ok', product: rows[0] });
  } catch (err) {
    console.error('Get product error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch product' });
  }
}

// POST /api/products  (requires auth)
async function createProduct(req, res) {
  try {
    const { title, description, price, category_id, condition, image_url } = req.body;

    if (!title || !price || !category_id) {
      return res.status(400).json({ status: 'error', message: 'title, price, and category_id are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO products (seller_id, category_id, title, description, price, \`condition\`, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, category_id, title, description || null, price, condition || 'used_good', image_url || null]
    );

    const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: 'Product listed successfully', product: rows[0] });
  } catch (err) {
    console.error('Create product error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to create product listing' });
  }
}

// PUT /api/products/:id  (requires auth, must be owner)
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [id]);
    const product = rows[0];

    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    if (product.seller_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'You can only edit your own listings' });
    }

    const { title, description, price, category_id, condition, image_url, status } = req.body;

    await pool.query(
      `UPDATE products SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        category_id = COALESCE(?, category_id),
        \`condition\` = COALESCE(?, \`condition\`),
        image_url = COALESCE(?, image_url),
        status = COALESCE(?, status)
       WHERE product_id = ?`,
      [title, description, price, category_id, condition, image_url, status, id]
    );

    const [updated] = await pool.query('SELECT * FROM products WHERE product_id = ?', [id]);
    res.json({ status: 'ok', message: 'Product updated', product: updated[0] });
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to update product' });
  }
}

// DELETE /api/products/:id  (requires auth, must be owner)
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM products WHERE product_id = ?', [id]);
    const product = rows[0];

    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    if (product.seller_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'You can only delete your own listings' });
    }

    await pool.query('DELETE FROM products WHERE product_id = ?', [id]);
    res.json({ status: 'ok', message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete product' });
  }
}

// GET /api/products/mine  (requires auth) - seller's own listings
async function getMyProducts(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       WHERE p.seller_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.userId]
    );
    res.json({ status: 'ok', products: rows });
  } catch (err) {
    console.error('Get my products error:', err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch your listings' });
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
};
