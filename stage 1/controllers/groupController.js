// controllers/groupController.js
const Group = require('../models/Group');
const User = require('../models/User');
const Channel = require('../models/Channel'); 


exports.createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const adminId = req.user.id; // We get this from the authMiddleware

    // Create the new group
    const newGroup = new Group({
      name,
      admins: [adminId]
    });
    await newGroup.save();

    // Also, add this group to the user's list of groups
    await User.findByIdAndUpdate(adminId, { $push: { groups: newGroup._id } });

    res.status(201).json(newGroup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Use Promise.all to run all database operations concurrently
    await Promise.all([
      // 1. Delete the group itself
      Group.findByIdAndDelete(groupId),

      // 2. Delete all channels associated with that group
      Channel.deleteMany({ groupId: groupId }),

      // 3. Update all users to remove this group from their 'groups' array
      User.updateMany(
        { groups: groupId },
        { $pull: { groups: groupId } }
      )
    ]);

    res.json({ message: 'Group and all associated data deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};


exports.requestToJoin = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // --- ADD THIS SECURITY CHECK ---
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // Check if the user is on the banned list
    if (group.bannedUsers.includes(userId)) {
      return res.status(403).json({ message: 'Forbidden: You are banned from this group' });
    }

    // Find the group and add the user's ID to the 'requests' array.
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { requests: userId } },
      { new: true }
    );

    res.json({ message: 'Join request sent successfully', group: updatedGroup });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.approveRequest = async (req, res) => {
  try {
    const { groupId } = req.params; // Get group ID from the URL
    const { userIdToApprove } = req.body; // Get user ID from the request body
    const adminId = req.user.id; // Get the admin's ID from the token

    // First, find the group to make sure the person approving is an admin
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Security Check: Is the person making the request actually an admin of this group?
    if (!group.admins.includes(adminId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an admin of this group' });
    }

    // Perform two database updates simultaneously for efficiency
    const [updatedGroup, updatedUser] = await Promise.all([
      // 1. Update the Group: Remove user from requests, add to members
      Group.findByIdAndUpdate(
        groupId,
        {
          $pull: { requests: userIdToApprove }, // $pull removes an item from an array
          $addToSet: { members: userIdToApprove } // $addToSet adds an item (if not already there)
        },
        { new: true }
      ),
      // 2. Update the User: Add group to the user's list of groups
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

exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id; // Get the user's own ID from their token

    // Perform two updates simultaneously
    await Promise.all([
      // 1. Remove user from the group's members list
      Group.findByIdAndUpdate(groupId, { $pull: { members: userId } }),
      // 2. Remove group from the user's groups list
      User.findByIdAndUpdate(userId, { $pull: { groups: groupId } })
    ]);

    res.json({ message: 'You have successfully left the group' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.banUser = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userIdToBan } = req.body;
    const adminId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Security Check: Only an admin of the group can ban users.
    if (!group.admins.includes(adminId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an admin of this group' });
    }

    // Perform multiple database updates
    await Promise.all([
      // 1. Update the Group: Remove user from members/requests, add to bannedUsers
      Group.findByIdAndUpdate(groupId, {
        $pull: { members: userIdToBan, requests: userIdToBan },
        $addToSet: { bannedUsers: userIdToBan }
      }),
      // 2. Update the User: Remove group from the user's list of groups
      User.findByIdAndUpdate(userIdToBan, { $pull: { groups: groupId } })
    ]);

    res.json({ message: 'User has been banned from the group successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.deleteOwnGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const adminId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Security Check: User must be an admin of this specific group
    if (!group.admins.includes(adminId)) {
      return res.status(403).json({ message: 'Forbidden: You are not an admin of this group' });
    }

    await Promise.all([
      Group.findByIdAndDelete(groupId),
      Channel.deleteMany({ groupId: groupId }),
      User.updateMany({ groups: groupId }, { $pull: { groups: groupId } })
    ]);

    res.json({ message: 'Group deleted successfully' });
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