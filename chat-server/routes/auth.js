const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
const { getDb } = require('../config/db');
const { check, validationResult } = require('express-validator');

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      const db = getDb();
      const usersCollection = db.collection('users');
      let user = await usersCollection.findOne({ email });

      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        username,
        email,
        password: hashedPassword,
        roles: ['User'],
        groups: [],
        channels: [],
        createdAt: new Date()
      };

      const result = await usersCollection.insertOne(newUser);

      const payload = { user: { id: result.insertedId, roles: newUser.roles } };
      
      // --- FIX IS HERE ---
      // Switched from a callback to the synchronous version of jwt.sign
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
      res.status(201).json({ token, userId: result.insertedId });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const db = getDb();
    //the user logs in with an email, get the same email from the req.body, to the one from the databas
    let user = await db.collection('users').findOne({ email });
    //if the email from the login does not exist from the database OR the password does not match the associated users 
    //password, then it is invlaid credentia;s
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }
    //the payload is the data included inside the Json Web Token (JWT)
    const payload = { user: { id: user._id, roles: user.roles } };
    // the token is created with jwt.sign(), which signs the payload with the secret key (process.env.JWT_SECRET)
    //process is the global object for all Node.js application
    //acess the env property (.env) in process, get JWT_SECRET env variable (from the .env file), for security
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
    //create a copy of user object from data base and delete the password, then send the json response
    //to front end.
    const userForResponse = { ...user };
    delete userForResponse.password;

    res.json({ token, user: userForResponse });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;