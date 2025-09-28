// controllers/channelController.js
const Channel = require('../models/Channel');
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');

exports.createChannel = async (req, res) => {
  try {
    const { name } = req.body;
    const { groupId } = req.params;
    const adminId = req.user.id;

    // security Check: find the group and verify the user is an admin
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!group.admins.includes(adminId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an admin of this group' });
    }

    // Create the new channel
    const newChannel = new Channel({
      name,
      groupId: groupId
    });
    await newChannel.save();

    // Add the new channel's ID to the parent group's list of channels
    group.channels.push(newChannel._id);
    await group.save();

    res.status(201).json(newChannel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const adminId = req.user.id;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const group = await Group.findById(channel.groupId);
    // Security Check: Only an admin of the parent group can delete its channels
    if (!group.admins.includes(adminId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an admin of this group' });
    }

    // Use Promise.all to perform deletions concurrently
    await Promise.all([
      // 1. Delete the channel itself
      Channel.findByIdAndDelete(channelId),
      // 2. Remove the channel's ID from the parent group's list of channels
      Group.findByIdAndUpdate(channel.groupId, { $pull: { channels: channelId } }),
      // 3. Remove the channel from any user who was a member of it
      User.updateMany({}, { $pull: { channels: channelId } })
    ]);

    res.json({ message: 'Channel deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
//channel history
exports.getChannelHistory = async (req, res) => {
    try {
        const { channelId } = req.params;
        const messages = await Message.find({ channelId })
        .sort({ createdAt: -1 }) // Get the newest messages first
        .limit(10); // Limit to the last 10 messages

        res.json(messages.reverse()); // Reverse to show oldest of the batch first
    } catch (err)
    {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};