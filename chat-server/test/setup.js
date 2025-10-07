require('dotenv').config({ path: 'chat-server/.env' });

const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, getDb, closeDb } = require('../config/db'); // Corrected path

let mongoServer;

// Runs once before all tests
before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Set the in-memory database URI before connecting
  process.env.MONGO_URI = mongoUri; 
  
  await connectDB();
});

// Runs once after all tests
after(async () => {
  await closeDb(); // Disconnect from the DB
  await mongoServer.stop(); // Stop the in-memory server
});

// Runs before each individual test
beforeEach(async () => {
  const db = getDb();
  const collections = await db.collections();
  
  // Clear all data from all collections
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});