const { app } = require('../server');
const { expect } = require('chai');
const request = require('supertest');
const { getDb } = require('../config/db');
const { createUserAndLogin } = require('./test-helper');


describe('Groups Routes API', () => {
    let db;
    let superAdminToken;
    let normalUserToken;
    let superAdminId;
    let normalUserId;

    // --- FIX IS HERE: Changed from before() to beforeEach() ---
    // This now runs before every "it" block, ensuring users exist for each test.
    beforeEach(async () => {
        db = getDb();

        // Helper function to create a user and get their token and ID
        
        
        const admin = await createUserAndLogin('admin', 'admin@test.com', 'password', ['Super Admin', 'User']);
        superAdminToken = admin.token;
        superAdminId = admin.id;

        const user = await createUserAndLogin('user', 'user@test.com', 'password', ['User']);
        normalUserToken = user.token;
        normalUserId = user.id;
    });

    describe('POST /api/groups - Create a new group', () => {
        it('should allow a Super Admin to create a group', async () => {
            const res = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'Super Admin Group' });

            expect(res.status).to.equal(201);
            expect(res.body.name).to.equal('Super Admin Group');
            // Note: Comparing ObjectIDs to strings can be tricky. This checks for existence.
            expect(res.body.admins[0]).to.exist; 
        });

        it('should FORBID a normal user from creating a group', async () => {
            const res = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${normalUserToken}`)
                .send({ name: 'User Group' });

            expect(res.status).to.equal(403);
            expect(res.body.msg).to.equal('Access denied. Insufficient permissions.');
        });

        it('should return 401 for unauthenticated requests', async () => {
            const res = await request(app)
                .post('/api/groups')
                .send({ name: 'No Auth Group' });

            expect(res.status).to.equal(401);
        });
    });

    describe('DELETE /api/groups/:groupId - Delete a group', () => {
        let groupId;

        beforeEach(async () => {
            // This beforeEach runs *after* the main one, so the users are already created
            const res = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'Group to Delete' });
            groupId = res.body._id;
        });

        it('should allow a Super Admin to delete a group', async () => {
            const res = await request(app)
                .delete(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.msg).to.equal('Group deleted');
        });

        it('should FORBID a normal user from deleting a group', async () => {
            const res = await request(app)
                .delete(`/api/groups/${groupId}`)
                .set('Authorization', `Bearer ${normalUserToken}`);

            expect(res.status).to.equal(403);
        });
    });
    describe('Group Membership', () => {
        let groupId;
        
        // Before each membership test, create a fresh group
        beforeEach(async () => {
            const res = await request(app)
                .post('/api/groups')
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'Membership Test Group' });
            groupId = res.body._id;
        });

        it('should allow a user to request to join a group', async () => {
            const res = await request(app)
                .post(`/api/groups/${groupId}/requests`)
                .set('Authorization', `Bearer ${normalUserToken}`);

            expect(res.status).to.equal(200);

            // Verify in the database
            const db = getDb();
            const group = await db.collection('groups').findOne({ _id: new (require('mongodb').ObjectId)(groupId) });
            const normalUserIdObject = new (require('mongodb').ObjectId)(normalUserId);
            const requestExists = group.requests.some(reqId => reqId.equals(normalUserIdObject));
            expect(requestExists).to.be.true;
        });

        it('should allow an admin to approve a join request', async () => {
            // Step 1: User requests to join
            await request(app)
                .post(`/api/groups/${groupId}/requests`)
                .set('Authorization', `Bearer ${normalUserToken}`);
            
            // Step 2: Admin approves the request
            const res = await request(app)
                .post(`/api/groups/${groupId}/approve`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ userIdToApprove: normalUserId });

            expect(res.status).to.equal(200);

            // Verify in the database
            const db = getDb();
            const group = await db.collection('groups').findOne({ _id: new (require('mongodb').ObjectId)(groupId) });
            const normalUserIdObject = new (require('mongodb').ObjectId)(normalUserId);
            
            const isMember = group.members.some(memberId => memberId.equals(normalUserIdObject));
            const isStillInRequests = group.requests.some(reqId => reqId.equals(normalUserIdObject));

            expect(isMember).to.be.true;
            expect(isStillInRequests).to.be.false;
        });
    it('should allow an admin to deny a join request', async () => {
            // Step 1: User requests to join
            await request(app)
                .post(`/api/groups/${groupId}/requests`)
                .set('Authorization', `Bearer ${normalUserToken}`);

            // Step 2: Admin denies the request
            const res = await request(app)
                .post(`/api/groups/${groupId}/deny`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ userIdToDeny: normalUserId });

            expect(res.status).to.equal(200);

            // Verify user is not in requests or members
            const db = getDb();
            const group = await db.collection('groups').findOne({ _id: new (require('mongodb').ObjectId)(groupId) });
            const normalUserIdObject = new (require('mongodb').ObjectId)(normalUserId);
            const isInRequests = group.requests.some(reqId => reqId.equals(normalUserIdObject));
            const isMember = group.members.some(memberId => memberId.equals(normalUserIdObject));
            
            expect(isInRequests).to.be.false;
            expect(isMember).to.be.false;
        });

        it('should allow an admin to remove a member from the group', async () => {
            // Step 1: Add user to the group
            await request(app).post(`/api/groups/${groupId}/requests`).set('Authorization', `Bearer ${normalUserToken}`);
            await request(app).post(`/api/groups/${groupId}/approve`).set('Authorization', `Bearer ${superAdminToken}`).send({ userIdToApprove: normalUserId });
            
            // Step 2: Admin removes the user
            const res = await request(app)
                .delete(`/api/groups/${groupId}/members/${normalUserId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).to.equal(200);
            
            // Verify user is no longer a member
            const db = getDb();
            const group = await db.collection('groups').findOne({ _id: new (require('mongodb').ObjectId)(groupId) });
            const normalUserIdObject = new (require('mongodb').ObjectId)(normalUserId);
            const isMember = group.members.some(memberId => memberId.equals(normalUserIdObject));
            expect(isMember).to.be.false;
        });

        it('should allow a member to leave a group', async () => {
            // Step 1: Add user to the group
            await request(app).post(`/api/groups/${groupId}/requests`).set('Authorization', `Bearer ${normalUserToken}`);
            await request(app).post(`/api/groups/${groupId}/approve`).set('Authorization', `Bearer ${superAdminToken}`).send({ userIdToApprove: normalUserId });

            // Step 2: User leaves the group (using their own token)
            const res = await request(app)
                .post(`/api/groups/${groupId}/leave`)
                .set('Authorization', `Bearer ${normalUserToken}`);

            expect(res.status).to.equal(200);

            // Verify user is no longer a member
            const db = getDb();
            const group = await db.collection('groups').findOne({ _id: new (require('mongodb').ObjectId)(groupId) });
            const normalUserIdObject = new (require('mongodb').ObjectId)(normalUserId);
            const isMember = group.members.some(memberId => memberId.equals(normalUserIdObject));
            expect(isMember).to.be.false;
        });    
    });
});