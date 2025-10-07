require('dotenv').config();
const express = require('express');
const http = require('http'); 
const cors = require('cors');
const path = require('path');
// DO NOT connect to the DB here anymore
const { connectDB } = require('./config/db'); 
const socketHandler = require('./controllers/socketHandler');

const app = express();
const server = http.createServer(app);

// MIDDLEWARE
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users')); 
app.use('/api/groups', require('./routes/groups'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/messages', require('./routes/messages'));

socketHandler(server);

const PORT = process.env.PORT || 3000;

// Only start the server and connect to the DB if NOT in a test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB(); // Connect to the database
  server.listen(PORT, () => {
    console.log(`API and chatServer running on port ${PORT}`);
  });
}

// Export the app for testing purposes
module.exports = { app, server };