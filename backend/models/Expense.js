/**
 * Expense Model
 * Core entity of the application. Each expense belongs to exactly one User,
 * enforcing data isolation — users can only read/write their own expenses.
 *
 * The 'user' field is a foreign-key reference to the User collection,
 * enabling Mongoose populate() calls when admin views need user details.
 *
 * Fields:
 *   user        - ObjectId ref to the owning User (required for all CRUD)
 *   title       - Short label for the expense (e.g. "Grocery run")
 *   category    - Enum-constrained category for filtering and trend charts
 *   amount      - Positive decimal; stored in AUD by convention
 *   date        - The actual date of spending (not the creation timestamp)
 *   description - Optional freeform notes
 */

const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Expense must belong to a user']
    },
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: ['Food', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Other'],
      default: 'Other'
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0.01, 'Amount must be greater than 0']
    },
    date: {
      type: Date,
      required: [true, 'Please provide a date'],
      default: Date.now
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
