// routes/channels.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');

// Middleware to check if the user is an admin of the group
const isGroupAdmin = async (req, res, next) => {
  try {
    const db = getDb();
    const groupId = new ObjectId(req.params.groupId);
    const adminId = new ObjectId(req.user.id);

    const group = await db.collection('groups').findOne({ _id: groupId, admins: adminId });
    if (!group && !req.user.roles.includes('Super Admin')) {
      return res.status(403).json({ msg: 'Access denied. Not an admin of this group.' });
    }
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/channels/:groupId
// @desc    Create a new channel within a group
// @access  Private (Group Admin)
router.post('/:groupId', [auth, isGroupAdmin], async (req, res) => {
  const { name } = req.body;
  const groupId = new ObjectId(req.params.groupId);

  try {
    const db = getDb();
    const newChannel = {
      name,
      groupId,
      members: [],
      createdAt: new Date()
    };

    const result = await db.collection('channels').insertOne(newChannel);
    const newChannelId = result.insertedId;

    await db.collection('groups').updateOne({ _id: groupId }, { $addToSet: { channels: newChannelId } });

    res.status(201).json({ ...newChannel, _id: newChannelId });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/channels/for-group/:groupId
// @desc    Get all channels for a specific group
// @access  Private
router.get('/for-group/:groupId', auth, async (req, res) => {
  try {
    const db = getDb();
    const channels = await db.collection('channels').find({ groupId: new ObjectId(req.params.groupId) }).toArray();
    res.json(channels);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/channels/:channelId/history
// @desc    Get recent messages for a channel with author details
// @access  Private
router.get('/:channelId/history', auth, async (req, res) => {
  try {
    const db = getDb();
    const channelId = new ObjectId(req.params.channelId);

    const messages = await db.collection('messages').aggregate([
      { $match: { channelId: channelId } },
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'username',    // <-- THE FIX IS HERE
          foreignField: 'username',  // <-- AND HERE
          as: 'authorInfo'
        }
      },
      {
        $project: {
          text: 1,
          imageUrl: 1,
          createdAt: 1,
          channelId: 1,
          username: 1,
          author: { $arrayElemAt: ['$authorInfo', 0] }
        }
      }
    ]).toArray();
    
    const messagesWithCleanAuthor = messages.map(msg => {
        if (msg.author) {
            msg.author = {
                _id: msg.author._id,
                username: msg.author.username,
                profilePicture: msg.author.profilePicture || '/uploads/default-avatar.png'
            }
        }
        return msg;
    });

    res.json(messagesWithCleanAuthor);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});



// @route   GET /api/channels
// @desc    Get all channels (for admin purposes)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const db = getDb();
    const channels = await db.collection('channels').find({}).toArray();
    res.json(channels);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;