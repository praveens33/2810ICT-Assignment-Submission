
const checkRoles = (allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles;

    if (!userRoles) {
      return res.status(403).json({ message: 'Forbidden: No roles found for user' });
    }

    const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));

    if (hasRequiredRole) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: You do not have the required permissions' });
    }
  };
};

module.exports = checkRoles;