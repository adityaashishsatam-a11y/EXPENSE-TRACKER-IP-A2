# Expense Tracker — Assignment 2

A full-stack expense tracking web application built with **React**, **Node.js/Express**, and **MongoDB Atlas**. Assignment 2 extends the A1 Expense Tracker with user authentication, private per-user data, live search, and a full admin panel.

---

## Problem Statement

Managing personal finances is challenging without a structured tool. This app provides a single-page interface where users can log, categorise, and review their spending over time — with role-based access so administrators can monitor usage and manage accounts.

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18, Axios, CSS              |
| Backend  | Node.js, Express.js               |
| Database | MongoDB Atlas (via Mongoose ODM)  |
| Auth     | bcryptjs (password hashing) + JWT |

---

## Features Added in Assignment 2

- **Registration & Login** — Secure auth with bcrypt-hashed passwords and JWT tokens
- **Private expenses** — Each user only sees and manages their own data
- **Live search** — Real-time filtering by title, category, or description (debounced, server-side regex)
- **Admin Panel** with three tabs:
  - Dashboard (total users, expenses, spending)
  - Users table (promote/demote, activate/deactivate, delete with cascade, drill-down to view expenses)
  - Activity log (all login, register, and CRUD events across all users)
- **Three entity types**: `User`, `Expense`, `UserActivity`
- **Role-based access control** enforced via JWT middleware (`protect` + `adminOnly`)

---

## Folder Structure

```
project/
│
├── backend/                    # Express API server
│   ├── controllers/            # Request handlers (business logic)
│   │   ├── authController.js   # Register, login, getMe
│   │   ├── expenseController.js# CRUD for user-scoped expenses + live search
│   │   └── adminController.js  # Admin: users, expenses, activity, stats
│   │
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification + admin-only guard
│   │
│   ├── models/                 # Mongoose schemas (one file per entity)
│   │   ├── User.js             # Entity 1: user accounts with role & isActive
│   │   ├── Expense.js          # Entity 2: expenses with user foreign key
│   │   └── UserActivity.js     # Entity 3: audit log of all user actions
│   │
│   ├── routes/                 # Express routers (map URLs to controllers)
│   │   ├── authRoutes.js       # /api/auth/*
│   │   ├── expenseRoutes.js    # /api/expenses/* (protected)
│   │   └── adminRoutes.js      # /api/admin/* (admin only)
│   │
│   ├── server.js               # App entry point: DB connect, middleware, routes
│   ├── .env.example            # Template for required environment variables
│   └── package.json
│
├── frontend/                   # React single-page application
│   ├── public/
│   │   └── index.html          # HTML shell; React mounts into #root
│   │
│   └── src/
│       ├── components/         # Reusable UI components
│       │   ├── AuthPage.js     # Login/Register form with tab switcher
│       │   ├── SearchBar.js    # Debounced live search input
│       │   ├── AdminPanel.js   # Full admin dashboard (3 tabs)
│       │   ├── ExpenseList.js  # Expense list with category filter & trend chart
│       │   ├── ExpenseItem.js  # Individual expense card
│       │   ├── ExpenseForm.js  # Add / edit expense form
│       │   └── ErrorBoundary.js# Catches unexpected React render errors
│       │
│       ├── services/           # API call wrappers (one file per domain)
│       │   ├── authService.js  # login(), register(), logout(), token helpers
│       │   ├── expenseService.js # CRUD wrappers for /api/expenses
│       │   ├── adminService.js # Wrappers for /api/admin
│       │   └── dateUtils.js    # Sydney timezone date formatting helpers
│       │
│       ├── styles/             # CSS files (one per component)
│       │   ├── App.css
│       │   ├── AuthPage.css
│       │   ├── SearchBar.css
│       │   ├── AdminPanel.css
│       │   ├── ExpenseList.css
│       │   ├── ExpenseItem.css
│       │   ├── ExpenseForm.css
│       │   └── index.css
│       │
│       ├── App.js              # Root component: auth gate, view routing, state
│       └── index.js            # React DOM entry point
│
├── SAMPLE_DATA.json            # Sample expense data for import/demo
└── README.md                   # This file
```

---

## How to Run

### Prerequisites
- Node.js v16+
- A MongoDB Atlas account and cluster

### 1. Backend

```bash
cd backend
npm install

# Create your .env file (copy from .env.example)
cp .env.example .env
# Then edit .env and fill in your values

npm run dev    # development with auto-reload (nodemon)
# or
npm start      # production
```

Backend runs at `http://localhost:5000`

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

---

## Environment Variables

### `backend/.env`
```
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
NODE_ENV=development
JWT_SECRET=choose_a_long_random_string_here
JWT_EXPIRE=7d
```

### `frontend/.env`
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | Public | Create account |
| POST | /api/auth/login | Public | Login, returns JWT |
| GET  | /api/auth/me | User | Current user profile |
| GET  | /api/expenses?search= | User | Get expenses (live search) |
| POST | /api/expenses | User | Create expense |
| PUT  | /api/expenses/:id | User | Update own expense |
| DELETE | /api/expenses/:id | User | Delete own expense |
| GET  | /api/admin/stats | Admin | Dashboard summary |
| GET  | /api/admin/users | Admin | All users + stats |
| GET  | /api/admin/users/:id/expenses | Admin | One user's expenses |
| PUT  | /api/admin/users/:id | Admin | Update role / status |
| DELETE | /api/admin/users/:id | Admin | Delete user + their data |
| PUT  | /api/admin/expenses/:id | Admin | Edit any expense |
| DELETE | /api/admin/expenses/:id | Admin | Delete any expense |
| GET  | /api/admin/activities | Admin | Full activity log |

---

## Making Your First Admin Account

1. Register normally through the UI
2. In MongoDB Atlas, open your cluster → Collections → `users`
3. Find your document and run:
```json
{ "$set": { "role": "admin" } }
```
4. Log out and log back in — the Admin tab will appear in the header
