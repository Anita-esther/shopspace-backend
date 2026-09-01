const express = require('express');
const router = express.Router();
const { createReview, getReviewsForUser } = require('../controllers/reviewsController');
const { requireAuth } = require('../middleware/auth');

// Reading reviews is public (same visibility as browsing products/sellers)
router.get('/user/:userId', getReviewsForUser);

// Leaving a review requires being logged in
router.post('/', requireAuth, createReview);

module.exports = router;
