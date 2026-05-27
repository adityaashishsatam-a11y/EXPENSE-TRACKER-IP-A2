/**
 * Expense Controller
 * Handles all CRUD operations for expenses. Every operation is scoped to the
 * authenticated user (req.user._id), so users can never access each other's data.
 *
 * Live Search:
 *   GET /api/expenses?search=coffee
 *   The search query is matched case-insensitively against title, category,
 *   and description using a MongoDB $or + RegExp query. Server-side search
 *   avoids fetching the entire collection into memory for client-side filtering.
 *
 * Activity Logging:
 *   Create, update, and delete operations write a UserActivity document so
 *   admins have a full audit trail of each user's expense history.
 *
 * Error handling:
 *   All catch blocks delegate to handleError() to keep formatting consistent
 *   and avoid duplicating Mongoose error-handling logic across controllers.
 */

const Expense        = require('../models/Expense');
const UserActivity   = require('../models/UserActivity');
const { handleError } = require('../utils/errorUtils');

// POST /api/expenses
exports.createExpense = async (req, res) => {
  try {
    const { title, category, amount, date, description } = req.body;

    if (!title || !category || amount === undefined) {
      return res.status(400).json({ error: 'Title, category, and amount are required.' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    // Always attach the authenticated user's ID — clients cannot override this
    const expense = await Expense.create({
      user:  req.user._id,
      title,
      category,
      amount,
      date:  date ? new Date(date) : new Date(),
      description
    });

    await UserActivity.create({
      user:   req.user._id,
      action: 'create_expense',
      detail: `Added expense: "${title}" ($${amount.toFixed(2)})`
    });

    res.status(201).json(expense);
  } catch (error) {
    handleError(res, error, 'Could not create expense. Please try again.');
  }
};

// GET /api/expenses?search=<query>
exports.getExpenses = async (req, res) => {
  try {
    const { search } = req.query;

    // Base filter: only this user's expenses
    const filter = { user: req.user._id };

    // Optional live search — case-insensitive regex across three text fields
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or  = [
        { title:       regex },
        { category:    regex },
        { description: regex }
      ];
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    handleError(res, error, 'Could not fetch expenses. Please try again.');
  }
};

// GET /api/expenses/:id
exports.getExpenseById = async (req, res) => {
  try {
    // Compound filter ensures users can only fetch their own expense by ID
    const expense = await Expense.findOne({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.status(200).json(expense);
  } catch (error) {
    handleError(res, error, 'Could not fetch expense.');
  }
};

// PUT /api/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const { title, category, amount, date, description } = req.body;

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    // findOneAndUpdate with user filter prevents editing another user's expense
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { title, category, amount, date: date ? new Date(date) : undefined, description },
      { new: true, runValidators: true } // new:true returns the updated document
    );

    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    await UserActivity.create({
      user:   req.user._id,
      action: 'update_expense',
      detail: `Updated expense: "${expense.title}"`
    });

    res.status(200).json(expense);
  } catch (error) {
    handleError(res, error, 'Could not update expense. Please try again.');
  }
};

// DELETE /api/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });

    await UserActivity.create({
      user:   req.user._id,
      action: 'delete_expense',
      detail: `Deleted expense: "${expense.title}" ($${expense.amount.toFixed(2)})`
    });

    res.status(200).json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    handleError(res, error, 'Could not delete expense. Please try again.');
  }
};
