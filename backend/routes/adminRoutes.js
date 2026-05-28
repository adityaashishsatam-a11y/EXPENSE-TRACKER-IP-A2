/* Author: Harshali Tambadkar (25543582) */
/**
 * Admin Routes — /api/admin/*
 *
 * All routes require both a valid JWT AND admin role
 * (enforced by router.use(protect, adminOnly)).
 * Non-admin users receive a 403 Forbidden response.
 *
 * User management:
 *   GET    /users               — list all users with expense stats
 *   GET    /users/:id/expenses  — drill-down: one user's full expense list
 *   PUT    /users/:id           — update role or isActive status
 *   DELETE /users/:id           — delete user and all their data (cascade)
 *
 * Expense management (admin can act on any user's expense):
 *   PUT    /expenses/:id        — edit any expense
 *   DELETE /expenses/:id        — delete any expense
 *
 * Dashboard & audit:
 *   GET    /stats               — summary counts for the dashboard cards
 *   GET    /activities          — chronological activity log (last 200 events)
 */

const express = require('express');
const {
  getAllUsers,
  getUserExpenses,
  updateUser,
  deleteUser,
  deleteExpense,
  updateExpense,
  getActivities,
  getStats
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// Both middlewares applied to every admin route
router.use(protect, adminOnly);

router.get('/stats',                getStats);
router.get('/users',                getAllUsers);
router.get('/users/:id/expenses',   getUserExpenses);
router.put('/users/:id',            updateUser);
router.delete('/users/:id',         deleteUser);
router.put('/expenses/:id',         updateExpense);
router.delete('/expenses/:id',      deleteExpense);
router.get('/activities',           getActivities);

module.exports = router;
