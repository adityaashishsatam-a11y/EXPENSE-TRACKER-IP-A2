/**
 * Expense Routes — /api/expenses/*
 *
 * All routes require a valid JWT (enforced by router.use(protect)).
 * Each operation is scoped to the authenticated user in the controller —
 * users cannot read, modify, or delete another user's expenses.
 *
 * GET / supports an optional ?search= query parameter for live search.
 */

const express = require('express');
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply JWT auth to every route in this file
router.use(protect);

router.post('/',    createExpense);
router.get('/',     getExpenses);      // Accepts ?search= for live search
router.get('/:id',  getExpenseById);
router.put('/:id',  updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
