const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    //get user data from the request body
    const { username, email, password } = req.body;

    // check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with that email already exists' });
    }

    // hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //create a new user with the hashed password
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    //sve the user to the database
    await newUser.save();

    //sucess response
    res.status(201).json({ message: 'User registered successfully', userId: newUser._id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};


exports.login = async (req, res) => {
  try {
    // get user data from the request body
    const { email, password } = req.body;

    //check if exist
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // check if passwrd maatches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    //create JWT token
    const payload = {
      user: {
        id: user.id,
        roles: user.roles 
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' }, // token expires in 5 hours
      (err, token) => {
        if (err) throw err;
        // token sent back to cliebnt
        res.json({ token, user }); 
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
