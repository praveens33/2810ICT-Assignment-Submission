const { app } = require('../server');
const { expect } = require('chai');
const request = require('supertest');
const { getDb } = require('../config/db');
const { createUserAndLogin } = require('./test-helper');

describe('Users Routes API', () => {
    let db;
    let superAdminToken;
    let normalUserToken;
    let userToModifyId;

    beforeEach(async () => {
        db = getDb();
        const admin = await createUserAndLogin('admin', 'admin@test.com', 'password', ['Super Admin', 'User']);
        superAdminToken = admin.token;

        const user = await createUserAndLogin('user', 'user@test.com', 'password', ['User']);
        normalUserToken = user.token;
        userToModifyId = user.id;
    });

    describe('GET /api/users', () => {
        it('should allow a Super Admin to get all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${superAdminToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body.length).to.equal(2); // admin and user
        });

        it('should FORBID a normal user from getting all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${normalUserToken}`);

            expect(res.status).to.equal(403);
        });
    });

    describe('PUT /api/users/:id/roles', () => {
        it("should allow a Super Admin to update a user's roles", async () => {
            const newRoles = ['User', 'Group Admin'];
            const res = await request(app)
                .put(`/api/users/${userToModifyId}/roles`)
                .set('Authorization', `Bearer ${superAdminToken}`)
                .send({ roles: newRoles });

            expect(res.status).to.equal(200);

            // Verify in the database
            const updatedUser = await db.collection('users').findOne({ email: 'user@test.com' });
            expect(updatedUser.roles).to.deep.equal(newRoles);
        });
    });
});