// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 1. get token from the header
  const token = req.header('Authorization');

  // 2. check if no token is present
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // the token from the header will look like "Bearer <token>". We need to remove "Bearer ".
  const actualToken = token.split(' ')[1];
  if (!actualToken) {
    return res.status(401).json({ message: 'Token format is invalid' });
  }

  // 3. verify the token
  try {
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);

    // 4. add the user's info from the token's payload to the request object
    req.user = decoded.user;
    
    // 5. call next() to proceed to the actual route controller
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};