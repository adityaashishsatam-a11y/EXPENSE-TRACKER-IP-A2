/**
 * Budget Model — Fourth Entity
 * Author: Aditya Ashish Satam (25402847)
 *
 * Allows users to set a monthly spending limit per expense category.
 * When fetched, actual spending for that period is aggregated server-side
 * and returned alongside the limit, giving the frontend a "limit vs actual"
 * pair without requiring a separate API call.
 *
 * Design decisions:
 *   - A compound unique index on (user, category, month, year) prevents
 *     duplicate budgets for the same period.  The controller uses upsert
 *     so setting a budget twice just updates the limit rather than erroring.
 *   - month and year are stored as plain numbers (not a Date) because budgets
 *     are always month-granular — storing a full Date would require normalising
 *     to the first of each month everywhere, which is error-prone.
 *   - category enum mirrors the Expense schema so cross-collection queries work
 *     without needing to re-validate the value.
 *
 * Fields:
 *   user         — ObjectId ref to owning User
 *   category     — One of the seven expense categories
 *   monthlyLimit — Maximum allowed spending for this category+month (AUD)
 *   month        — 1–12
 *   year         — 4-digit year (e.g. 2025)
 */

const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = [
  'Food', 'Transportation', 'Entertainment',
  'Utilities', 'Healthcare', 'Shopping', 'Other'
];

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Budget must belong to a user']
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: EXPENSE_CATEGORIES
    },
    monthlyLimit: {
      type: Number,
      required: [true, 'Please set a monthly limit'],
      min: [0.01, 'Limit must be greater than 0'],
      max: [1000000, 'Limit cannot exceed $1,000,000']
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 2000,
      max: 2100
    }
  },
  { timestamps: true }
);

// One budget per user+category per month — prevents duplicates
budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
