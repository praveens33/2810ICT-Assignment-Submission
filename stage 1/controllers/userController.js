// controllers/userController.js
const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    // Find all users but do not include their password field in the response
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.updateUserRoles = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body; // Expect an array of strings, e.g., ["User", "Group Admin"]

    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ message: 'Roles must be provided as an array.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { roles: roles } }, // Use $set to completely replace the roles array
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    await Promise.all([
      // 1. Delete the user document
      User.findByIdAndDelete(userId),

      // 2. Update all groups to remove the user from any list they might be in
      Group.updateMany(
        {}, // An empty filter {} means update ALL groups
        { 
          $pull: { 
            admins: userId, 
            members: userId, 
            requests: userId, 
            bannedUsers: userId 
          } 
        }
      )
    ]);

    res.json({ message: 'User and all associated references deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.superAdminCreateUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if required fields are provided
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with that email already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user with the hashed password
    const newUser = new User({
      username,
      email,
      password: hashedPassword
      // Roles will default to ['User'] as defined in the schema
    });

    await newUser.save();
    res.status(201).json(newUser);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.deleteOwnAccount = async (req, res) => {
  try {
    const userId = req.user.id; // Get the user's own ID from their token

    await Promise.all([
      User.findByIdAndDelete(userId),
      Group.updateMany(
        {},
        { $pull: { admins: userId, members: userId, requests: userId, bannedUsers: userId } }
      )
    ]);

    res.json({ message: 'Your account has been permanently deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};