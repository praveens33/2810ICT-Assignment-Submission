// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 1. Get token from the header
  const token = req.header('Authorization');

  // 2. Check if no token is present
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // The token from the header will look like "Bearer <token>". We need to remove "Bearer ".
  const actualToken = token.split(' ')[1];
  if (!actualToken) {
    return res.status(401).json({ message: 'Token format is invalid' });
  }

  // 3. Verify the token
  try {
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    // 4. Add the user's info from the token's payload to the request object
    req.user = decoded.user;
    
    // 5. Call next() to proceed to the actual route controller
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};