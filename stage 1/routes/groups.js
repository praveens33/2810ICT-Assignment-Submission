// routes/groups.js
const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRoles = require('../middleware/rolesMiddleware');

// POST /api/groups - Create a new group
router.post('/', 
  authMiddleware, 
  checkRoles(['Super Admin', 'Group Admin']), // 2. Add the role check here
  groupController.createGroup
);

router.post('/:id/requests', authMiddleware, groupController.requestToJoin);
//admin approves of user request
router.post('/:groupId/approve', authMiddleware, groupController.approveRequest);

router.get('/', authMiddleware, groupController.getAllGroups); 
module.exports = router;