const request = require('supertest');
const { app } = require('../server');
const { getDb } = require('../config/db');
const { ObjectId } = require('mongodb');

const createUserAndLogin = async (username, email, password, roles = ['User']) => {
    const db = getDb();

    const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ username, email, password });
    const userId = registerRes.body.userId;

    await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { roles: roles } }
    );

    const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    return { token: loginRes.body.token, id: userId };
};

module.exports = { createUserAndLogin };