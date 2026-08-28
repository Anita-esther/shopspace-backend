const express = require('express');
const router = express.Router();
const { getConversations, getThread, sendMessage } = require('../controllers/messagesController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth); // every messages route requires login

router.get('/conversations', getConversations);
router.get('/:otherUserId', getThread);
router.post('/', sendMessage);

module.exports = router;
