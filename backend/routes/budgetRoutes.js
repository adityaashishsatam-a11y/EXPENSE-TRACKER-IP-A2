/* Author: Aditya Ashish Satam (25402847) */
/**
 * Budget Routes — /api/budgets/*
 * Author: Aditya Ashish Satam (25402847)
 *
 * All routes require a valid JWT (enforced by router.use(protect)).
 * Operations are scoped to the authenticated user in the controller.
 *
 * GET  /          — fetch user's budgets for a given month (default: current)
 * POST /          — create or update a budget (upsert by category+month+year)
 * PUT  /:id       — update the limit of an existing budget
 * DELETE /:id     — delete a budget
 */

const express = require('express');
const {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// JWT required for every budget operation
router.use(protect);

router.get('/',       getBudgets);
router.post('/',      createBudget);
router.put('/:id',    updateBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
