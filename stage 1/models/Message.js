// models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  imageUrl: {
    type: String,
    default: null
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt timestamps

module.exports = mongoose.model('Message', MessageSchema);