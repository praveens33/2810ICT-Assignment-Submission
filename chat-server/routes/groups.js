// routes/groups.js
const express = require('express');
const router = express.Router();
const { getDb } = require('../config/db');
const { ObjectId } = require('mongodb');
const auth = require('../middleware/auth');

// Middleware to check for specific roles
const checkRoles = (roles) => (req, res, next) => {
  if (!roles.some(role => req.user.roles.includes(role))) {
    return res.status(403).json({ msg: 'Access denied. Insufficient permissions.' });
  }
  next();
};

// POST /api/groups - Create a new group
router.post('/', [auth, checkRoles(['Super Admin', 'Group Admin'])], async (req, res) => {
  const { name } = req.body;
  const adminId = new ObjectId(req.user._id);

  try {
    const db = getDb();
    const groupsCollection = db.collection('groups');

    const newGroup = {
      name,
      admins: [adminId],
      members: [adminId],
      requests: [],
      bannedUsers: [],
      channels: [],
      createdAt: new Date()
    };

    const result = await groupsCollection.insertOne(newGroup);
    
    // Add group to user's groups array
    await db.collection('users').updateOne(
      { _id: adminId },
      { $addToSet: { groups: result.insertedId } }
    );

    res.status(201).json({ ...newGroup, _id: result.insertedId });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.post('/:groupId/members', auth, async (req,res) => {
    const {userIdToAdd} = req.body;
    const groupId = new ObjectId(req.params.groupId);
    const adminId = new ObjectId(req.user._id);
    const userToAddId = new ObjectId(userIdToAdd);
    try {
      const db = getDb();
      const groupsCollection = db.collection('groups');
      // Check if the current user is a Super Admin or an admin of this specific group
      const group = await groupsCollection.findOne({ _id: groupId, admins: adminId });
      const isSuperAdmin = req.user.roles.includes('Super Admin');

      if (!group && !isSuperAdmin) {
        return res.status(403).json({ msg: 'Access denied. Not an admin of this group.' });
      }

      // Add user to the group's member array, using $addToSet to avoid duplicates
      await groupsCollection.updateOne(
        { _id: groupId },
        { $addToSet: { members: userToAddId } } 
      );

      // Also, add the group to the user's groups array
      await db.collection('users').updateOne(
        { _id: userToAddId },
        { $addToSet: { groups: groupId } }
      );

      res.json({msg: 'User added to group succesfully'});
    } catch (err){
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

// DELETE /api/groups/:groupId - Delete a group (Super Admin only)
router.delete('/:groupId', auth, async (req, res) => {
  try {
    const db = getDb();
    const groupId = new ObjectId(req.params.groupId);
    const requestingUserId = new ObjectId(req.user._id);

    const group = await db.collection('groups').findOne({ _id: groupId });
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    const isSuperAdmin = req.user.roles.includes('Super Admin');
    const isGroupAdmin = group.admins.map(id => id.toString()).includes(requestingUserId.toString());

    // A Group Admin can only delete a group if they are the *only* admin.
    if (!isSuperAdmin && !(isGroupAdmin && group.admins.length === 1)) {
      return res.status(403).json({ msg: 'Access denied. You must be a Super Admin or the sole admin of this group to delete it.' });
    }

    //  simplified delete. A full implementation would also clean up
    // references in users, channels, messages, etc.
    const result = await db.collection('groups').deleteOne({ _id: groupId });

    // Remove group from all users' groups array
    await db.collection('users').updateMany(
      { groups: groupId },
      { $pull: { groups: groupId } }
    );

    res.json({ msg: 'Group deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/groups/:id/requests - Request to join a group
router.post('/:id/requests', auth, async (req, res) => {
  try {
    console.log('--- A user requested to join a group ---');
    console.log('User object from token:', req.user);
    console.log('ID being saved to requests:', req.user._id);
    const db = getDb();
    const result = await db.collection('groups').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $addToSet: { requests: new ObjectId(req.user._id) } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    res.json({ msg: 'Request to join sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/groups/:groupId/approve - Admin approves a user's request to join
router.post('/:groupId/approve', auth, async (req, res) => {
  const { userIdToApprove } = req.body;
  const groupId = new ObjectId(req.params.groupId);
  const adminId = new ObjectId(req.user._id);
  const userToApproveId = new ObjectId(userIdToApprove);

  try {
    const db = getDb();
    const groupsCollection = db.collection('groups');
    //find group
    const group = await groupsCollection.findOne({ _id: groupId });
    if (!group) {
      return res.status(403).json({ msg: 'Not authorized to approve requests for this group' });
    }

    // Check if the user to approve is in the bannedUsers array
    const isBanned = group.bannedUsers.map(id => id.toString()).includes(userToApproveId.toString());
    if (isBanned) {
      // If banned, just remove them from requests and do not approve
      await groupsCollection.updateOne({ _id: groupId }, { $pull: { requests: userToApproveId } });
      return res.status(403).json({ msg: 'This user is banned from the group. Request removed.' });
    }


    const isSuperAdmin = req.user.roles.includes('Super Admin');
    //comparing ids as string to avoid objectid comparison issue
    const isGroupAdmin = group.admins.map(id => id.toString()).includes(adminId.toString());

    if (!isSuperAdmin && !isGroupAdmin) {
      return res.status(403).json({ msg: 'Not authorized to approve requests for this group' });
      //if not authorised deny access
    
    }
    //if authorised add user
        
    // Add user to members and remove from requests
    
    const channelsInGroup = await db.collection('channels')
        .find({ groupId: groupId })
        .project({ _id: 1 }) // Only get the _id field
        .toArray();
    
    const channelIds = channelsInGroup.map(c => c._id); // Create an array of ObjectIds

    // 2. Add the user to the group's members and remove from requests (existing code)
    await groupsCollection.updateOne(
      { _id: groupId },
      {
        $addToSet: { members: userToApproveId },
        $pull: { requests: userToApproveId }
      }
    );

    // 3. Update the user's document to add both the group AND all of its channels
    await db.collection('users').updateOne(
      { _id: userToApproveId },
      { 
        $addToSet: { 
          groups: groupId,
          channels: { $each: channelIds } // Add all channel IDs to the user's channels array
        } 
      }
    );

    res.json({ msg: 'User approved' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/groups/:groupId/leave - User leaves a group
router.post('/:groupId/leave', auth, async (req, res) => {
    const groupId = new ObjectId(req.params.groupId);
    const userId = new ObjectId(req.user._id);

    try {
        const db = getDb();

        // 1. Remove the user from the group's members and admins lists
        await db.collection('groups').updateOne(
            { _id: groupId }, 
            { $pull: { members: userId, admins: userId } }
        );

        // 2. NEW: Get all channel IDs for the group the user is leaving
        const channelsInGroup = await db.collection('channels')
            .find({ groupId: groupId })
            .project({ _id: 1 })
            .toArray();
        
        const channelIds = channelsInGroup.map(c => c._id);

        // 3. Update the user's document to remove the group and all associated channels
        await db.collection('users').updateOne(
            { _id: userId }, 
            { 
                $pull: { 
                    groups: groupId, 
                    // NEW: Also remove user from all of the group's channels
                    channels: { $in: channelIds } 
                } 
            }
        );
        
        res.json({ msg: 'You have successfully left the group.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET /api/groups - Get all groups
router.get('/', auth, async (req, res) => {
  try {
    const db = getDb();
    const groups = await db.collection('groups').find({}).toArray();
    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});router.post('/:groupId/deny', auth, async (req, res) => {
  const { userIdToDeny } = req.body;
  const groupId = new ObjectId(req.params.groupId);
  const adminId = new ObjectId(req.user._id);
  const userToDenyId = new ObjectId(userIdToDeny);

  try {
    const db = getDb();
    const groupsCollection = db.collection('groups');

    // Find the group to verify admin permissions
    const group = await groupsCollection.findOne({ _id: groupId });
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if the current user is a Super Admin or an admin of this specific group
    const isSuperAdmin = req.user.roles.includes('Super Admin');
    const isGroupAdmin = group.admins.map(id => id.toString()).includes(adminId.toString());

    if (!isSuperAdmin && !isGroupAdmin) {
      return res.status(403).json({ msg: 'Not authorized to deny requests for this group' });
    }

    // If authorized, simply remove the user's ID from the requests array
    await groupsCollection.updateOne(
      { _id: groupId },
      { $pull: { requests: userToDenyId } }
    );

    res.json({ msg: 'User request denied' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/:groupId/ban', auth, async (req, res) => {
  const { userIdToBan } = req.body;
  const groupId = new ObjectId(req.params.groupId);
  const adminId = new ObjectId(req.user._id);
  const userToBanId = new ObjectId(userIdToBan);

  try {
    const db = getDb();
    const groupsCollection = db.collection('groups');

    // --- Authorization Check ---
    const group = await db.collection('groups').findOne({ _id: groupId });
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    const targetUser = await db.collection('users').findOne({ _id: userToBanId });
    if (!targetUser) {
      return res.status(404).json({ msg: 'User to ban not found' });
    }

    if (targetUser.roles.includes('Super Admin')) {
      return res.status(403).json({ msg: 'Cannot ban a Super Admin' });
    }

    const isSuperAdmin = req.user.roles.includes('Super Admin');
    const isGroupAdmin = group.admins.map(id => id.toString()).includes(adminId.toString());

    if (!isSuperAdmin && !isGroupAdmin) {
      return res.status(403).json({ msg: 'Access denied. Not an admin of this group.' });
    }

    if (targetUser.roles.includes('Group Admin') && !isSuperAdmin) {
      return res.status(403).json({ msg: 'Only a Super Admin can ban a Group Admin.' });
    }


    // 1. Add user to bannedUsers list and remove from members/admins/requests
    await db.collection('groups').updateOne(
      { _id: groupId },
      {
        $addToSet: { bannedUsers: userToBanId },
        $pull: { members: userToBanId, admins: userToBanId, requests: userToBanId }
      }
    );

    // 2. Get all channel IDs for the group
    const channelsInGroup = await db.collection('channels').find({ groupId: groupId }).project({ _id: 1 }).toArray();
    const channelIds = channelsInGroup.map(c => c._id);

    // 3. Update the user's document to remove the group and all its channels
    await db.collection('users').updateOne(
      { _id: userToBanId },
      { $pull: { groups: groupId, channels: { $in: channelIds } } }
    );

    res.json({ msg: 'User has been banned and removed from the group.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
router.post('/:groupId/unban', auth, async (req, res)=> {
  const { userIdToUnban } = req.body;
  const groupId  = new ObjectId(req.params.groupId);
  const adminId = new ObjectId(req.user._id);
  const userToUnbanId = new ObjectId(userIdToUnban);


  try{
    const db = getDb();
    const groupsCollection = db.collection('groups');
    const group = await db.collection('groups').findOne({ _id: groupId });
    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    const targetUser = await db.collection('users').findOne({ _id: userToUnbanId });
    if (!targetUser) {
      return res.status(404).json({ msg: 'User to unban not found' });
    }

    await db.collection('groups').updateOne(
      { _id: groupId },
      { $pull: { bannedUsers: userToUnbanId } }
    );
    res.json({msg:'User unbanned'});
  }catch(err){
    console.error(err.message);
    res.status(500).send('Server Error');

  }

    


})

router.delete('/:groupId/members/:userId', auth, async (req, res) => {
    const groupId = new ObjectId(req.params.groupId);
    const userIdToRemove = new ObjectId(req.params.userId);
    const adminId = new ObjectId(req.user._id);

    try {
        const db = getDb();
        
        // First, check if the person making the request has permission
        const group = await db.collection('groups').findOne({ _id: groupId });
        if (!group) {
            return res.status(404).json({ msg: 'Group not found.' });
        }

        const isSuperAdmin = req.user.roles.includes('Super Admin');
        const isGroupAdmin = group.admins.map(id => id.toString()).includes(adminId.toString());

        if (!isSuperAdmin && !isGroupAdmin) {
            return res.status(403).json({ msg: 'Access denied. Not an admin of this group.' });
        }
        await db.collection('groups').updateOne(
            { _id: groupId },
            { $pull: { members: userIdToRemove, admins: userIdToRemove } }
        );

        // 2. NEW: Get all channel IDs for the group the user is being removed from
        const channelsInGroup = await db.collection('channels')
            .find({ groupId: groupId })
            .project({ _id: 1 })
            .toArray();
        
        const channelIds = channelsInGroup.map(c => c._id);

        // 3. Update the user's document to remove the group and all associated channels
        await db.collection('users').updateOne(
            { _id: userIdToRemove },
            { 
                $pull: { 
                    groups: groupId, 
                    // UPDATE: Also remove the user from all of the group's channels
                    channels: { $in: channelIds } 
                } 
            }
        );
        
        
        // Permission granted, now remove the user
        // 1. Remove the user from the group's members and admins arrays
        await db.collection('groups').updateOne(
            { _id: groupId },
            { $pull: { members: userIdToRemove, admins: userIdToRemove } }
        );

        // 2. Remove the group from the user's groups array
        await db.collection('users').updateOne(
            { _id: userIdToRemove },
            { $pull: { groups: groupId } }
        );

        res.json({ msg: 'User removed from group successfully.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;