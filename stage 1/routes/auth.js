// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Define the route: POST /api/auth/register
router.post('/register', authController.register);
//Post /api/auth/login
router.post('/login', authController.login);


module.exports = router;