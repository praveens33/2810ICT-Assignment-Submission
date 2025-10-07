const { app } = require('../server');
const { expect } = require('chai');
const request = require('supertest');
const { getDb } = require('../config/db');
const { createUserAndLogin } = require('./test-helper');

describe('Channels Routes API', () => {
    let db;
    let superAdminToken;
    let normalUserToken;
    let groupId;

    beforeEach(async () => {
        db = getDb();
        const admin = await createUserAndLogin('admin', 'admin@test.com', 'password', ['Super Admin', 'User']);
        superAdminToken = admin.token;

        const user = await createUserAndLogin('user', 'user@test.com', 'password', ['User']);
        normalUserToken = user.token;
        const normalUserId = user.id;

        // Create a group for the tests
        const groupRes = await request(app)
            .post('/api/groups')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({ name: 'Test Group for Channels' });
        groupId = groupRes.body._id;

        // Make the normal user a member of the group (but not an admin)
        await request(app).post(`/api/groups/${groupId}/approve`).set('Authorization', `Bearer ${superAdminToken}`).send({ userIdToApprove: normalUserId });
    });

    describe('POST /api/channels/:groupId', () => {
        it('should allow a group admin to create a new channel', async () => {
            const res = await request(app)
                .post(`/api/channels/${groupId}`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ name: 'General' });

            expect(res.status).to.equal(201);
            expect(res.body.name).to.equal('General');

            // Verify the channel was added to the group in the DB
            const group = await db.collection('groups').findOne({ _id: new (require('mongodb').ObjectId)(groupId) });
            expect(group.channels).to.have.lengthOf(1);
        });

        it('should FORBID a non-admin member from creating a channel', async () => {
            const res = await request(app)
                .post(`/api/channels/${groupId}`)
                .set('Authorization', `Bearer ${normalUserToken}`)
                .send({ name: 'Unauthorized Channel' });

            expect(res.status).to.equal(403);
        });
    });

    describe('GET /api/channels/for-group/:groupId', () => {
        it('should allow a group member to get the list of channels', async () => {
            // First, create a channel to find
            await request(app).post(`/api/channels/${groupId}`).set('Authorization', `Bearer ${superAdminToken}`).send({ name: 'General' });
            
            const res = await request(app)
                .get(`/api/channels/for-group/${groupId}`)
                .set('Authorization', `Bearer ${normalUserToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(1);
            expect(res.body[0].name).to.equal('General');
        });
    });
     describe('DELETE /api/channels/:channelId', () => {
        let channelId;

        beforeEach(async () => {
            // Create a channel to delete
            const res = await request(app).post(`/api/channels/${groupId}`).set('Authorization', `Bearer ${superAdminToken}`).send({ name: 'To Be Deleted' });
            channelId = res.body._id;
        });

        it('should allow a group admin to delete a channel', async () => {
            const res = await request(app)
                .delete(`/api/channels/${channelId}`)
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.msg).to.equal('Channel and its messages have been removed successfully.');
        });
         it('should FORBID a non-admin member from deleting a channel', async () => {
            const res = await request(app)
                .delete(`/api/channels/${channelId}`)
                .set('Authorization', `Bearer ${normalUserToken}`);

            expect(res.status).to.equal(403);
        });
    });
});