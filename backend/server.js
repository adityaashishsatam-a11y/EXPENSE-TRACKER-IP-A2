/**
 * server.js — Application Entry Point
 *
 * Bootstraps the Express server:
 *   1. Connects to MongoDB Atlas (exits process on failure so the container
 *      restarts rather than silently serving with no database)
 *   2. Registers global middleware (CORS, JSON body parsing)
 *   3. Mounts route groups under their API prefixes
 *   4. Registers a catch-all error handler and 404 handler
 *
 * Route structure:
 *   /api/auth/*     — public: register, login, get current user
 *   /api/expenses/* — protected: per-user CRUD + live search
 *   /api/admin/*    — admin only: user management, activity log, stats
 *
 * Environment variables (see .env.example):
 *   MONGO_URI  — MongoDB Atlas connection string
 *   PORT       — port to listen on (default 5000)
 *   JWT_SECRET — secret used to sign and verify JWTs
 *   JWT_EXPIRE — token lifetime (default "7d")
 */

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
require('dotenv').config();

const authRoutes    = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const adminRoutes   = require('./routes/adminRoutes');

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────

// Allow cross-origin requests from the React dev server (localhost:3000)
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// ── Database Connection ───────────────────────────────────────────────────────

/**
 * Connects to MongoDB Atlas using the URI from environment variables.
 * serverSelectionTimeoutMS and connectTimeoutMS are set explicitly so the
 * app fails fast in CI/CD or misconfigured environments instead of hanging.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) throw new Error('MONGO_URI is not defined in .env');

    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000
    });
    console.log('✓ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    console.warn('⚠ Server will continue running without database connection');
    // Continue running instead of exiting - useful for development/debugging
  }
};

connectDB();

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/auth',     authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/admin',    adminRoutes);

// Health check — useful for deployment platforms and load balancers
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '2.0.0' });
});

// ── Error Handlers ────────────────────────────────────────────────────────────

// Catch-all for unhandled errors thrown or passed to next() in route handlers
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// 404 for any route not matched above
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Start Server ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`   Auth:     http://localhost:${PORT}/api/auth`);
  console.log(`   Expenses: http://localhost:${PORT}/api/expenses`);
  console.log(`   Admin:    http://localhost:${PORT}/api/admin\n`);
});
