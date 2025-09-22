// controllers/groupController.js
const Group = require('../models/Group');
const User = require('../models/User');

exports.createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const adminId = req.user.id; 
    const newGroup = new Group({
      name,
      admins: [adminId]
    });
    await newGroup.save();

    await User.findByIdAndUpdate(adminId, { $push: { groups: newGroup._id } });

    res.status(201).json(newGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.requestToJoin = async (req, res) => {
  try {
    const groupId = req.params.id; 
    const userId = req.user.id;   

   
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { requests: userId } },
      { new: true } 
    );

    if (!updatedGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json({ message: 'Join request sent successfully', group: updatedGroup });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.approveRequest = async (req, res) => {
  try {
    const { groupId } = req.params; 
    const { userIdToApprove } = req.body; 
    const adminId = req.user.id; 
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.admins.includes(adminId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an admin of this group' });
    }

    const [updatedGroup, updatedUser] = await Promise.all([
      Group.findByIdAndUpdate(
        groupId,
        {
          $pull: { requests: userIdToApprove }, 
          $addToSet: { members: userIdToApprove } 
        },
        { new: true }
      ),
      User.findByIdAndUpdate(
        userIdToApprove,
        { $addToSet: { groups: groupId } },
        { new: true }
      )
    ]);

    res.json({ message: 'User approved successfully', group: updatedGroup });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find();
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};