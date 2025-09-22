const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    // find all users but dont include password
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};