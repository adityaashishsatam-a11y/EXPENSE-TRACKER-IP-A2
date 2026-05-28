/**
 * Admin Controller
 * Full administrative control over users, expenses, and activity logs.
 * All routes are protected by both `protect` and `adminOnly` middleware.
 *
 * Design decisions:
 *  - Deleting a user cascades to their expenses and activity logs to prevent
 *    orphaned documents (no foreign-key enforcement in MongoDB by default)
 *  - Admins cannot delete or demote themselves to prevent accidental lockout
 *  - Stats use MongoDB aggregation pipelines rather than loading all documents
 *    into memory and summing in JS — keeps performance consistent as data grows
 *  - Promise.all() parallelises per-user expense queries in getAllUsers so
 *    n users cost one round-trip each concurrently, not n sequential trips
 *  - Activity log is capped at 200 entries in the query to keep the response
 *    size manageable as the collection grows over time
 *
 * Error handling:
 *   All catch blocks delegate to handleError() from errorUtils to keep
 *   Mongoose error formatting consistent and non-duplicated.
 */

const User           = require('../models/User');
const Expense        = require('../models/Expense');
const UserActivity   = require('../models/UserActivity');
const { handleError } = require('../utils/errorUtils');

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers    = await User.countDocuments({ role: 'user' });
    const totalExpenses = await Expense.countDocuments();

    // Aggregate overall total and this month's total in parallel for efficiency
    const [totalSpentAgg, thisMonthAgg, lastMonthAgg, categoryBreakdown] = await Promise.all([
      // All-time total spending
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Spending in the current calendar month
      Expense.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Spending in the previous calendar month (for comparison)
      Expense.aggregate([
        { $match: { date: { $gte: lastMonth, $lt: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Break total spending down by category for the admin chart
      Expense.aggregate([
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ])
    ]);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email createdAt role');

    res.status(200).json({
      totalUsers,
      totalExpenses,
      totalSpent:      totalSpentAgg[0]?.total  || 0,
      spentThisMonth:  thisMonthAgg[0]?.total   || 0,
      expensesThisMonth: thisMonthAgg[0]?.count || 0,
      spentLastMonth:  lastMonthAgg[0]?.total   || 0,
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c._id,
        total:    c.total,
        count:    c.count
      })),
      recentUsers
    });
  } catch (error) {
    handleError(res, error, 'Could not load dashboard stats.');
  }
};

// GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    // Promise.all runs all per-user queries concurrently instead of sequentially
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const expenseCount  = await Expense.countDocuments({ user: user._id });
        const totalSpentAgg = await Expense.aggregate([
          { $match: { user: user._id } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return {
          _id:          user._id,
          name:         user.name,
          email:        user.email,
          role:         user.role,
          isActive:     user.isActive,
          createdAt:    user.createdAt,
          expenseCount,
          totalSpent:   totalSpentAgg[0]?.total || 0
        };
      })
    );

    res.status(200).json(usersWithStats);
  } catch (error) {
    handleError(res, error, 'Could not load users.');
  }
};

// GET /api/admin/users/:id/expenses
exports.getUserExpenses = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const expenses = await Expense.find({ user: req.params.id }).sort({ date: -1 });
    res.status(200).json({
      user: { _id: user._id, name: user.name, email: user.email },
      expenses
    });
  } catch (error) {
    handleError(res, error, 'Could not load user expenses.');
  }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
  try {
    // Prevent admin from accidentally revoking their own admin access
    if (req.params.id === req.user._id.toString() && req.body.role === 'user') {
      return res.status(400).json({ error: 'You cannot remove your own admin role.' });
    }

    const { name, email, role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.status(200).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, isActive: user.isActive, createdAt: user.createdAt
    });
  } catch (error) {
    handleError(res, error, 'Could not update user.');
  }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  try {
    // Prevent self-deletion to avoid accidental admin lockout
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Cascade: remove all data belonging to this user
    await Expense.deleteMany({ user: req.params.id });
    await UserActivity.deleteMany({ user: req.params.id });

    res.status(200).json({ message: `User "${user.email}" and all their data have been deleted.` });
  } catch (error) {
    handleError(res, error, 'Could not delete user.');
  }
};

// PUT /api/admin/expenses/:id
exports.updateExpense = async (req, res) => {
  try {
    const { title, category, amount, date, description } = req.body;

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, category, amount, date: date ? new Date(date) : undefined, description },
      { new: true, runValidators: true }
    );

    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.status(200).json(expense);
  } catch (error) {
    handleError(res, error, 'Could not update expense.');
  }
};

// DELETE /api/admin/expenses/:id
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.status(200).json({ message: 'Expense deleted.' });
  } catch (error) {
    handleError(res, error, 'Could not delete expense.');
  }
};

// GET /api/admin/activities
exports.getActivities = async (req, res) => {
  try {
    const activities = await UserActivity.find()
      .populate('user', 'name email') // Join name/email for display in the UI
      .sort({ createdAt: -1 })
      .limit(200); // Cap at 200 to keep response size manageable

    res.status(200).json(activities);
  } catch (error) {
    handleError(res, error, 'Could not load activity log.');
  }
};
