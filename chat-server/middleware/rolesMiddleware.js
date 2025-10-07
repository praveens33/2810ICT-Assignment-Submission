// middleware/rolesMiddleware.js

// This function takes an array of allowed roles...
const checkRoles = (allowedRoles) => {
  // ...and returns a middleware function
  return (req, res, next) => {
    // We assume the authMiddleware has already run and attached the user to the request
    const userRoles = req.user.roles;

    if (!userRoles) {
      return res.status(403).json({ message: 'Forbidden: No roles found for user' });
    }

    // Check if the user's roles array contains at least one of the allowed roles
    const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));

    if (hasRequiredRole) {
      // If they have the role, proceed to the next function (the controller)
      next();
    } else {
      // If not, send a "Forbidden" error
      res.status(403).json({ message: 'Forbidden: You do not have the required permissions' });
    }
  };
};

module.exports = checkRoles;