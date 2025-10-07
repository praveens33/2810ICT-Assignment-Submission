    const { getDb } = require('../config/db');
    const { ObjectId } = require('mongodb');

    let io;

    // This array will live in memory to track who is in the video call.
    const videoCallPeers = new Map(); // Using a Map to associate socket.id with peerId

    const socketHandler = (server) => {
        io = require('socket.io')(server, {
            path: '/socket.io',
            cors: {
                origin: "http://localhost:4200", // Allow requests from the Angular app
                methods: ["GET", "POST"]
            },
            transports: ['websocket', 'polling']
        });

        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            //Chat Logic
            let currentChannelId = null;
            let currentUsername = 'A user';
            //server recieves joinChannel event
            socket.on('joinChannel', async ({ channelId, username }) => {
                if (currentChannelId) {
                    socket.leave(currentChannelId);
                    io.to(currentChannelId).emit('userNotification', {
                        text: `${username} has left the channel.`
                    });
                }
                socket.join(channelId);
                currentChannelId = channelId;
                currentUsername = username;
                io.to(channelId).emit('userNotification', {
                    text: `${username} has joined the channel.`
                });
                console.log(`${username} (${socket.id}) joined channel ${channelId}`);
            });

            socket.on('sendMessage', async (messageData) => {
                const { channelId, username, text, imageUrl } = messageData;
                if (!channelId || !username || (!text && !imageUrl)) return;
                try {
                    const db = getDb();
                    const messagesCollection = db.collection('messages');
                    const usersCollection = db.collection('users');

                    // get author data
                    const author = await usersCollection.findOne(
                        { username: username },
                        { projection: { username: 1, profilePicture: 1 } } 
                    );

                    if (!author) {
                        return console.error(`Author with username ${username} not found.`);
                    }

                    // build complete message object
                    const newMessage = {
                        channelId: new ObjectId(channelId),
                        username, 
                        text,
                        imageUrl,
                        author: { // attach the full author object
                            _id: author._id,
                            username: author.username,
                            profilePicture: author.profilePicture || '/uploads/default-avatar.png'
                        },
                        createdAt: new Date()
                    };

                    // save object into database
                    const result = await messagesCollection.insertOne(newMessage);
                    
                    //send to front end
                    const messageToSend = { ...newMessage, _id: result.insertedId };
                    
                    io.to(channelId).emit('newMessage', messageToSend);

                } catch (error) {
                    console.error('Error saving or broadcasting message:', error);
                }
            });

            

            // video call logic

            // wen a user joins the video call
            socket.on('join-video-call', (peerId) => {
                console.log(`Peer ${peerId} joined video call from socket ${socket.id}`);
                
                const existingPeers = Array.from(videoCallPeers.values());
                socket.emit('existing-peers', existingPeers);
                
                socket.broadcast.emit('new-peer-joined',peerId);

                videoCallPeers.set(socket.id, peerId);

            });

            // if a user leaves call
            socket.on('leave-video-call', () => {
                const peerId = videoCallPeers.get(socket.id);
                if (peerId) {
                    socket.broadcast.emit('peer-left', peerId);
                    videoCallPeers.delete(socket.id);
                    console.log(`Peer ${peerId} left video call.`);
                }
            });


            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
                // handling chat disconnect
                if (currentChannelId) {
                    io.to(currentChannelId).emit('userNotification', { text: `${currentUsername} has disconnected.` });
                }

                //  Video Call Disconnect
                const disconnectedPeerId = videoCallPeers.get(socket.id); // <-- The fix is here
                if (disconnectedPeerId) {
                    // notifiy user that this peer has left
                    socket.broadcast.emit('peer-left', disconnectedPeerId);
                    videoCallPeers.delete(socket.id);
                    console.log(`Peer ${disconnectedPeerId} was disconnected from video call.`);
                }
            });
        });
    };

    module.exports = socketHandler;