// routes/channels.js
const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/channels/:groupId - Create a new channel within a group
router.post('/:groupId', authMiddleware, channelController.createChannel);

module.exports = router;