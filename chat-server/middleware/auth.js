const jwt = require('jsonwebtoken');
const { getDb } = require('../config/db');
const { ObjectId } = require('mongodb');

module.exports = async function(req, res, next) {
  // 1. Get token from the 'Authorization' header
  const authHeader = req.header('Authorization');

  // 2. Check if the header exists and is in the correct "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token or invalid format, authorization denied' });
  }

  try {
    // 3. Extract the token from the "Bearer <token>" string
    const token = authHeader.split(' ')[1];

    // 4. Verify the extracted token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const db = getDb();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.user.id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }

    // Attach the full user object to the request
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};