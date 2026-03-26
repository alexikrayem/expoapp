// middleware/requireCustomer.js
// Ensures a customer identity is already attached to the request.

const requireCustomer = (req, res, next) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role && req.user.role !== 'customer') {
    return res.status(403).json({ error: 'Forbidden: invalid user role.' });
  }
  return next();
};

module.exports = requireCustomer;
