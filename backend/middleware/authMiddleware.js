/* Author: Aditya Ashish Satam (25402847) */
/**
 * Authentication & Authorisation Middleware
 *
 * Two middleware functions used to protect routes:
 *
 *  1. protect     — Verifies the JWT in the Authorization header and attaches
 *                   the decoded user to req.user. Rejects requests with no token,
 *                   expired tokens, or tokens belonging to deleted/inactive users.
 *
 *  2. adminOnly   — Must be chained AFTER protect. Rejects any user whose role
 *                   is not 'admin'. Returns 403 (Forbidden) rather than 401
 *                   (Unauthorised) because the user IS authenticated, just not
 *                   permitted to access that resource.
 *
 * Usage:
 *   router.get('/secret', protect, handler);
 *   router.get('/admin-only', protect, adminOnly, handler);
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Attaches the full User document to req.user for downstream handlers.
 */
exports.protect = async (req, res, next) => {
  try {
    // Expect header: "Authorization: Bearer <token>"
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorised. Please log in.' });
    }

    // Throws if token is expired or signature is invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch user from DB to ensure account still exists and is active
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: 'Your account has been deactivated. Contact an admin.' });
    }

    req.user = user; // Make user available to all subsequent middleware/handlers
    next();
  } catch (error) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
};

/**
 * Restricts access to admin-role users only.
 * Must be used after `protect` so req.user is guaranteed to be set.
 */
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};
