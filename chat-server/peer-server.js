
const express = require('express');
const http = require('http');
const { ExpressPeerServer } = require('peer');

const app = express();
const server = http.createServer(app);

const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/' 
});

app.use('/peerjs', peerServer);

const PORT = 3001; 

server.listen(PORT, () => {
  console.log(`PeerJS server running on port ${PORT}`);
});