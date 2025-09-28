// models/Channel.js
const mongoose = require('mongoose');

const ChannelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  }
});

module.exports = mongoose.model('Channel', ChannelSchema);