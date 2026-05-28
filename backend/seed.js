/**
 * seed.js — Database Seed Script
 * Author: Aditya Ashish Satam (25402847)
 *
 * Populates the database with sample users and expenses for demo/testing.
 * Safe to re-run — clears existing data first so the result is always predictable.
 *
 * Usage:
 *   node backend/seed.js
 *
 * Requires backend/.env to be configured with a valid MONGO_URI.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

const User         = require('./models/User');
const Expense      = require('./models/Expense');
const Budget       = require('./models/Budget');
const UserActivity = require('./models/UserActivity');

const SEED_USERS = [
  { name: 'Demo Admin',   email: 'admin@demo.com', password: 'admin123', role: 'admin' },
  { name: 'Alice Johnson', email: 'alice@demo.com', password: 'alice123', role: 'user'  },
  { name: 'Bob Smith',    email: 'bob@demo.com',   password: 'bob123',   role: 'user'  }
];

const EXPENSE_TEMPLATES = [
  { title: 'Weekly Groceries',     category: 'Food',           amount: 87.50,  daysAgo: 1,  description: 'Woolworths — fruit, veg, dairy' },
  { title: 'Bus Monthly Pass',     category: 'Transportation', amount: 50.00,  daysAgo: 3,  description: 'Opal card top-up' },
  { title: 'Netflix Subscription', category: 'Entertainment',  amount: 22.99,  daysAgo: 5,  description: 'Monthly streaming' },
  { title: 'Electricity Bill',     category: 'Utilities',      amount: 134.20, daysAgo: 7,  description: 'April billing cycle' },
  { title: 'GP Visit',             category: 'Healthcare',     amount: 39.00,  daysAgo: 10, description: 'Bulk-billed gap payment' },
  { title: 'Running Shoes',        category: 'Shopping',       amount: 119.95, daysAgo: 12, description: 'Nike Air Zoom' },
  { title: 'Coffee & Lunch',       category: 'Food',           amount: 24.50,  daysAgo: 14, description: 'CBD café' },
  { title: 'Uber Ride',            category: 'Transportation', amount: 18.40,  daysAgo: 16, description: 'Late-night trip home' },
  { title: 'Cinema Tickets',       category: 'Entertainment',  amount: 36.00,  daysAgo: 18, description: '2x adult tickets' },
  { title: 'Internet Bill',        category: 'Utilities',      amount: 79.00,  daysAgo: 20, description: 'Monthly NBN plan' }
];

const BUDGET_TEMPLATES = [
  { category: 'Food',           monthlyLimit: 300.00 },
  { category: 'Transportation', monthlyLimit: 100.00 },
  { category: 'Entertainment',  monthlyLimit: 80.00  },
  { category: 'Utilities',      monthlyLimit: 400.00 },
  { category: 'Healthcare',     monthlyLimit: 100.00 },
  { category: 'Shopping',       monthlyLimit: 150.00 }
];

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const run = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set in .env');

    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Expense.deleteMany({}),
      Budget.deleteMany({}),
      UserActivity.deleteMany({})
    ]);
    console.log('✓ Cleared existing data');

    // Create users (password hashing is handled by the User pre-save hook)
    const createdUsers = [];
    for (const u of SEED_USERS) {
      const user = await User.create(u);
      createdUsers.push(user);
      await UserActivity.create({
        user: user._id, action: 'register',
        detail: `Seed: account created for ${u.email}`
      });
    }
    console.log(`✓ Created ${createdUsers.length} users`);

    // Assign expenses and budgets to non-admin users
    const regularUsers = createdUsers.filter(u => u.role === 'user');
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    for (const user of regularUsers) {
      // Give each user their own copy of the expenses
      const expenses = EXPENSE_TEMPLATES.map(t => ({
        user:        user._id,
        title:       t.title,
        category:    t.category,
        amount:      t.amount,
        date:        daysAgo(t.daysAgo),
        description: t.description
      }));
      await Expense.insertMany(expenses);

      // Set budgets for current month
      const budgets = BUDGET_TEMPLATES.map(b => ({
        user:         user._id,
        category:     b.category,
        monthlyLimit: b.monthlyLimit,
        month:        currentMonth,
        year:         currentYear
      }));
      await Budget.insertMany(budgets);
    }

    console.log(`✓ Created ${EXPENSE_TEMPLATES.length * regularUsers.length} expenses`);
    console.log(`✓ Created ${BUDGET_TEMPLATES.length * regularUsers.length} budgets`);

    console.log('\n── Demo Accounts ─────────────────────────────');
    SEED_USERS.forEach(u =>
      console.log(`  ${u.role.padEnd(5)}  ${u.email.padEnd(20)}  pw: ${u.password}`)
    );
    console.log('─────────────────────────────────────────────\n');

    await mongoose.disconnect();
    console.log('✓ Done. Database is ready for demo.\n');
    process.exit(0);
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  }
};

run();
