/* Author: Aditya Ashish Satam (25402847) */
/**
 * Auth Routes — /api/auth/*
 *
 * Public routes (no JWT required):
 *   POST /register — create a new user account
 *   POST /login    — authenticate and receive a JWT
 *
 * Protected route:
 *   GET  /me       — return the currently authenticated user's profile
 *                    (requires valid JWT via the `protect` middleware)
 */

const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login',    login);
router.get('/me', protect, getMe); // JWT required

module.exports = router;
