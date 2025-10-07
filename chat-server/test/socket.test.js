const { expect } = require('chai');
const { io } = require('socket.io-client');
const { server } = require('../server');
const { getDb } = require('../config/db');
// ADD THIS LINE to generate valid IDs
const { ObjectId } = require('mongodb');

describe('Socket.IO Chat Server', () => {
    let clientSocket1, clientSocket2, db;
    const PORT = 3001;

    before((done) => {
        db = getDb();
        server.listen(PORT, done);
    });

    after(() => {
        server.close();
    });

    beforeEach(async () => {
        const usersCollection = db.collection('users');
        await usersCollection.insertMany([
            { username: 'Alice', email: 'alice@test.com' },
            { username: 'Bob', email: 'bob@test.com' },
            { username: 'Charlie', email: 'charlie@test.com' }
        ]);

        const socketUrl = `http://localhost:${PORT}`;
        clientSocket1 = io(socketUrl, { path: '/socket.io' });
        clientSocket2 = io(socketUrl, { path: '/socket.io' });
        
        await new Promise((resolve) => {
            let connectCount = 0;
            const onConnect = () => {
                connectCount++;
                if (connectCount === 2) resolve();
            };
            clientSocket1.on('connect', onConnect);
            clientSocket2.on('connect', onConnect);
        });
    });

    afterEach(() => {
        if (clientSocket1.connected) clientSocket1.disconnect();
        if (clientSocket2.connected) clientSocket2.disconnect();
    });

    it('should broadcast a new message to all users in a channel', (done) => {
        // FIX: Generate a valid ObjectId string for the channelId
        const channelId = new ObjectId().toHexString();
        const messageData = { channelId, username: 'Alice', text: 'Hello World' };
        let messagesReceived = 0;

        clientSocket1.emit('joinChannel', { channelId, username: 'Alice' });
        clientSocket2.emit('joinChannel', { channelId, username: 'Bob' });

        const checkDone = () => {
            messagesReceived++;
            if (messagesReceived === 2) done();
        };

        clientSocket1.on('newMessage', (msg) => {
            expect(msg.text).to.equal(messageData.text);
            checkDone();
        });
        clientSocket2.on('newMessage', (msg) => {
            expect(msg.text).to.equal(messageData.text);
            checkDone();
        });
        
        setTimeout(() => clientSocket1.emit('sendMessage', messageData), 100);
    });
    
    it('should save a new message to the database', (done) => {
        // FIX: Generate a valid ObjectId string for the channelId
        const channelId = new ObjectId().toHexString();
        const messageData = { channelId, username: 'Charlie', text: 'Testing DB save' };

        clientSocket1.emit('joinChannel', { channelId, username: 'Charlie' });
        
        clientSocket1.on('newMessage', async (msg) => {
            const savedMessage = await db.collection('messages').findOne({ text: messageData.text });
            expect(savedMessage).to.not.be.null;
            expect(savedMessage.username).to.equal('Charlie');
            // Also check that the channelId was saved correctly
            expect(savedMessage.channelId.toHexString()).to.equal(channelId);
            done();
        });
        
        setTimeout(() => clientSocket1.emit('sendMessage', messageData), 100);
    });
});