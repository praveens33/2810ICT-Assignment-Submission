// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    // 1. Get user data from the request body
    const { username, email, password } = req.body;

    // 2. Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with that email already exists' });
    }

    // 3. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create a new user with the hashed password
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    // 5. Save the user to the database
    await newUser.save();

    // 6. Send a success response
    res.status(201).json({ message: 'User registered successfully', userId: newUser._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};


exports.login = async (req, res) => {
  try {
    // 1. Get user data from the request body
    const { email, password } = req.body;

    // 2. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Check if the password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 4. User is valid, create a JWT token
    const payload = {
      user: {
        id: user.id,
        roles: user.roles // Include roles for front-end access control
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET, // A secret key you will create
      { expiresIn: '5h' }, // Token expires in 5 hours
      (err, token) => {
        if (err) throw err;
        // 5. Send the token back to the client
        res.json({ token, user }); // Also send back user info
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
