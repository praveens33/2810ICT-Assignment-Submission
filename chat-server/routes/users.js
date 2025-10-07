const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');

// Middleware to check for Admin roles (Super or Group)
const adminAccess = (req, res, next) => {
  const roles = req.user.roles;
  if (!roles.includes('Super Admin') && !roles.includes('Group Admin')) {
    return res.status(403).json({ msg: 'Access denied. Admin role required.' });
  }
  next();
};

// @route   GET api/users
// @desc    Get all users
// @access  Private (Admins)
router.get('/', [auth, adminAccess], async (req, res) => {
  try {
    const db = getDb();
    const users = await db.collection('users').find({}).project({ password: 0 }).toArray(); // Exclude passwords
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/users
// @desc    Create a user (by Super Admin)
// @access  Private (Admins)
router.post('/', [auth, adminAccess], async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ msg: 'Please provide username and email' });
  }

  try {
    const db = getDb();
    const usersCollection = db.collection('users');

    // check if a user with the same email or username already exists
    let user = await usersCollection.findOne({ $or: [{ email }, { username }] });
    if (user) {
      if (user.email === email) {
        return res.status(400).json({ msg: 'A user with that email already exists.' });
      }
      //the username matches
      return res.status(400).json({ msg: 'A user with that username already exists.' });
    }

    const newUser = {
      username,
      email,
      password: 'defaultpassword', 
      roles: ['User'],
      groups: [],
      channels: [],
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    
    delete newUser.password;
    res.status(201).json({ ...newUser, _id: result.insertedId });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/users/:id
// @desc    Update a user's details (username, email)
// @access  Private (Admins)
router.put('/:id', [auth, adminAccess], async (req, res) => {
  const { username, email } = req.body;
  
  try {
    const db = getDb();
    const usersCollection = db.collection('users');

    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({ msg: 'User updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/users/:id/roles
// @desc    Update a user's roles (promote/demote)
// @access  Private (Admins)
router.put('/:id/roles', [auth, adminAccess], async (req, res) => {
  const { roles } = req.body;

  if (!Array.isArray(roles)) {
    return res.status(400).json({ msg: 'Roles must be an array' });
  }

  try {
    const db = getDb();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { roles: roles } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({ msg: 'User roles updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/users/:id
// @desc    Delete a user
// @access  Private (Admins)
router.delete('/:id', [auth, adminAccess], async (req, res) => {
  try {
    const db = getDb();
    const userId = new ObjectId(req.params.id);

    // to do: In a full application, you would also want to remove this user 
    const result = await db.collection('users').deleteOne({ _id: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json({ msg: 'User removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;