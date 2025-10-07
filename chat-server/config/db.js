const { MongoClient } = require('mongodb');

// Declare client and db at the top level, but do NOT initialize the client here.
let client;
let db;

const connectDB = async () => {
  try {
    // This is the ONLY place the client should be created.
    // It uses the MONGO_URI that our test setup provides before this function runs.
    client = new MongoClient(process.env.MONGO_URI); 

    await client.connect();
    db = client.db();
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
};

const closeDb = async () => {
  if (client) {
    await client.close();
  }
};

module.exports = { connectDB, getDb, closeDb };