const Channel = require('../models/Channel');
const Group = require('../models/Group');

exports.createChannel = async (req, res) => {
  try {
    const { name } = req.body;
    const { groupId } = req.params;
    const adminId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!group.admins.includes(adminId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an admin of this group' });
    }

    const newChannel = new Channel({
      name,
      groupId: groupId
    });
    await newChannel.save();

    group.channels.push(newChannel._id);
    await group.save();

    res.status(201).json(newChannel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};