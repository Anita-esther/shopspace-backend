const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const categoriesRoutes = require('./routes/categories');
const messagesRoutes = require('./routes/messages');
const transactionsRoutes = require('./routes/transactions');
const reviewsRoutes = require('./routes/reviews');

const app = express();

// --- Middleware ---
app.use(cors());              // Allow the React frontend (on a different origin) to call this API
app.use(express.json());      // Parse JSON request bodies

// --- Routes ---
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/reviews', reviewsRoutes);

// Placeholder for upcoming route groups:
// app.use('/api/products', require('./routes/products'));
// app.use('/api/categories', require('./routes/categories'));
// app.use('/api/messages', require('./routes/messages'));
// app.use('/api/transactions', require('./routes/transactions'));
// app.use('/api/reports', require('./routes/reports'));
// app.use('/api/notifications', require('./routes/notifications'));

// --- Root route ---
app.get('/', (req, res) => {
  res.send('ShopSpace API is live.');
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ShopSpace API running on port ${PORT}`);
});
