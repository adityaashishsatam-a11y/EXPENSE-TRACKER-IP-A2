/**
 * Budget Controller
 * Author: Aditya Ashish Satam (25402847)
 *
 * Full CRUD for per-user monthly category budgets.
 * Every operation is scoped to req.user._id so users cannot see or
 * modify each other's budgets.
 *
 * GET /api/budgets
 *   Accepts ?month= and ?year= (defaults to current month/year).
 *   Joins each budget with the user's actual spending for that category
 *   and month via a MongoDB aggregation — no extra client requests needed.
 *
 * POST /api/budgets
 *   Uses findOneAndUpdate with upsert: true so re-submitting a budget for
 *   the same category+month replaces the limit instead of returning a
 *   duplicate-key error.
 *
 * PUT /api/budgets/:id
 *   Updates only the monthlyLimit; category and period are immutable.
 *
 * DELETE /api/budgets/:id
 *   Hard delete — budgets are lightweight and an archive is unnecessary.
 */

const Budget  = require('../models/Budget');
const Expense = require('../models/Expense');
const { handleError } = require('../utils/errorUtils');

// ── Helpers ───────────────────────────────────────────────────────────────────

const currentMonth = () => new Date().getMonth() + 1; // 1-indexed
const currentYear  = () => new Date().getFullYear();

/**
 * Calculates total spending for a user in a given category and month.
 * Uses a MongoDB aggregation pipeline so the sum is computed in the database
 * rather than loading all matching documents into memory.
 */
const getActualSpent = async (userId, category, month, year) => {
  const start = new Date(year, month - 1, 1);     // first day of the month
  const end   = new Date(year, month,     1);     // first day of next month (exclusive)

  const [result] = await Expense.aggregate([
    {
      $match: {
        user:     userId,
        category: category,
        date:     { $gte: start, $lt: end }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return result?.total || 0;
};

// ── Route Handlers ────────────────────────────────────────────────────────────

// GET /api/budgets?month=&year=
exports.getBudgets = async (req, res) => {
  try {
    const month = parseInt(req.query.month) || currentMonth();
    const year  = parseInt(req.query.year)  || currentYear();

    // Validate range to avoid nonsensical queries
    if (month < 1 || month > 12 || year < 2000) {
      return res.status(400).json({ error: 'Invalid month or year.' });
    }

    const budgets = await Budget.find({ user: req.user._id, month, year });

    // Enrich each budget with actual spending for the period
    const budgetsWithActual = await Promise.all(
      budgets.map(async (b) => ({
        ...b.toObject(),
        actualSpent: await getActualSpent(req.user._id, b.category, month, year)
      }))
    );

    res.status(200).json(budgetsWithActual);
  } catch (error) {
    handleError(res, error, 'Could not fetch budgets.');
  }
};

// POST /api/budgets
exports.createBudget = async (req, res) => {
  try {
    const { category, monthlyLimit } = req.body;
    const month = parseInt(req.body.month) || currentMonth();
    const year  = parseInt(req.body.year)  || currentYear();

    if (!category || monthlyLimit === undefined) {
      return res.status(400).json({ error: 'Category and monthly limit are required.' });
    }
    if (typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
      return res.status(400).json({ error: 'Monthly limit must be a positive number.' });
    }

    // Upsert: create if not exists, otherwise update the limit
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category, month, year },
      { monthlyLimit },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    // Return with actual spending so the UI has everything in one response
    const actualSpent = await getActualSpent(req.user._id, category, month, year);
    res.status(201).json({ ...budget.toObject(), actualSpent });
  } catch (error) {
    handleError(res, error, 'Could not save budget.');
  }
};

// PUT /api/budgets/:id
exports.updateBudget = async (req, res) => {
  try {
    const { monthlyLimit } = req.body;

    if (monthlyLimit === undefined || typeof monthlyLimit !== 'number' || monthlyLimit <= 0) {
      return res.status(400).json({ error: 'Monthly limit must be a positive number.' });
    }

    // Compound filter ensures users can only update their own budgets
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { monthlyLimit },
      { new: true, runValidators: true }
    );

    if (!budget) return res.status(404).json({ error: 'Budget not found.' });

    const actualSpent = await getActualSpent(req.user._id, budget.category, budget.month, budget.year);
    res.status(200).json({ ...budget.toObject(), actualSpent });
  } catch (error) {
    handleError(res, error, 'Could not update budget.');
  }
};

// DELETE /api/budgets/:id
exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ error: 'Budget not found.' });
    res.status(200).json({ message: `Budget for "${budget.category}" deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete budget.');
  }
};
