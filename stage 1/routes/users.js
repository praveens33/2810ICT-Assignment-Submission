// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/users
// This route is protected. The 'authMiddleware' will run first.
// If the token is valid, it will then call 'userController.getAllUsers'.
router.get('/', authMiddleware, userController.getAllUsers);

module.exports = router;