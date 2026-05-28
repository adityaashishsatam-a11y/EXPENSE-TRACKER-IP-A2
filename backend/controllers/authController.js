/* Author: Aditya Ashish Satam (25402847) */
/**
 * Auth Controller
 * Handles user registration, login, and fetching the current user's profile.
 *
 * Security decisions:
 *  - Passwords are hashed by the User model's pre-save hook (bcrypt, cost 10)
 *  - JWTs are signed with JWT_SECRET from env and expire after JWT_EXPIRE (default 7d)
 *  - Login error messages are intentionally vague ("Invalid email or password")
 *    to prevent user enumeration attacks — an attacker should not be able to
 *    distinguish "email not found" from "wrong password"
 *  - Activity logs are written for register and login events for the admin audit trail
 *
 * Shared utility:
 *  - handleError() (from errorUtils) centralises Mongoose validation and
 *    duplicate-key error formatting so it is not duplicated across controllers
 */

const jwt          = require('jsonwebtoken');
const User         = require('../models/User');
const UserActivity = require('../models/UserActivity');
const { handleError } = require('../utils/errorUtils');

/**
 * Signs a JWT containing the user's MongoDB _id.
 * Secret and expiry come from environment variables — never hardcoded.
 */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

/**
 * Builds the safe user object returned to the client.
 * Explicitly omits password (which has select:false in the schema anyway).
 * Extracted as a helper to ensure register and login return identical shapes.
 */
const buildUserPayload = (user) => ({
  _id:       user._id,
  name:      user.name,
  email:     user.email,
  role:      user.role,
  createdAt: user.createdAt
});

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate presence before hitting the database
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    // Manual duplicate check gives a cleaner message than a Mongoose index error
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Password hashing is handled automatically by the User pre-save hook
    const user = await User.create({ name, email, password });

    // Log registration event for the admin activity audit trail
    await UserActivity.create({
      user:      user._id,
      action:    'register',
      detail:    `New account registered: ${email}`,
      ipAddress: req.ip
    });

    res.status(201).json({ token: signToken(user._id), user: buildUserPayload(user) });
  } catch (error) {
    handleError(res, error, 'Registration failed. Please try again.');
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    // select('+password') is required because the schema sets select:false
    const user = await User.findOne({ email }).select('+password');

    // Same error for "not found" and "wrong password" to prevent enumeration
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Your account has been deactivated. Contact an admin.' });
    }

    await UserActivity.create({
      user:      user._id,
      action:    'login',
      detail:    'Logged in successfully',
      ipAddress: req.ip
    });

    res.status(200).json({ token: signToken(user._id), user: buildUserPayload(user) });
  } catch (error) {
    handleError(res, error, 'Login failed. Please try again.');
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    // req.user is attached by the protect middleware; re-fetch for freshness
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(200).json(buildUserPayload(user));
  } catch (error) {
    handleError(res, error, 'Could not retrieve profile.');
  }
};
