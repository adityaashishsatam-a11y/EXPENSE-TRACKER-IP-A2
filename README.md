# Expense Tracker — Assignment 2

**UTS Internet Programming (31748/32516) — Group Assignment 2**
**Student:** Aditya Ashish Satam (25402847)

---

## Problem Statement

Managing personal finances without a structured tool leads to overspending and poor visibility into spending habits. This app gives users a single-page interface to log, categorise, search, and review their expenses over time — with monthly budget limits per category and a full admin panel for site-wide management.

The app solves three real-world needs:
1. **Personal tracking** — Log expenses by category with optional notes and date
2. **Budget awareness** — Set per-category monthly limits and see live progress bars
3. **Administrative oversight** — Admins can monitor all users, view their expenses, audit login/action history, and manage accounts

---

## Tech Stack

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Frontend   | React 18 (SPA), Axios, plain CSS            |
| Backend    | Node.js, Express.js                         |
| Database   | MongoDB Atlas via Mongoose ODM              |
| Auth       | bcryptjs (password hashing) + JWT           |
| Dev tools  | nodemon, dotenv, react-scripts              |

---

## Features

### User Features
- **Register & Login** — JWT-based auth, bcrypt password hashing, session persisted in localStorage
- **Expense CRUD** — Create, read, update, delete expenses with title, category, amount, date, notes
- **Live Search** — Debounced (300 ms) server-side search across title, category, and description
- **Category Filter** — Client-side filter applied on top of the server response
- **Monthly Trend Chart** — Collapsible bar chart grouped by month
- **Spending Summary** — Current-month total, month-over-month % change, per-category breakdown
- **Budget Manager** — Set monthly limits per category; progress bars show actual vs limit
- **CSV Export** — Download all current expenses as a `.csv` file

### Admin Features (role-restricted)
- **Dashboard** — All-time totals, this-month vs last-month comparison, category spending chart, recent registrations
- **User Management** — View all users, promote/demote admin role, activate/deactivate accounts, delete with cascade
- **Expense Drill-down** — View and delete any user's individual expenses
- **Activity Log** — Full audit trail of login, register, and all expense CRUD events

---

## Three Entity Types (Assignment Requirement)

| Entity         | Collection      | Description |
|----------------|-----------------|-------------|
| `User`         | `users`         | Registered accounts with role (`user`/`admin`) and `isActive` flag |
| `Expense`      | `expenses`      | Per-user spending records; foreign key to User |
| `UserActivity` | `useractivities`| Append-only audit log of all user actions |
| `Budget`       | `budgets`       | Per-user monthly category spending limits |

---

## Folder Structure

```
a2/
│
├── backend/                        # Express REST API
│   ├── controllers/
│   │   ├── authController.js       # Register, login, getMe
│   │   ├── expenseController.js    # CRUD + live search (user-scoped)
│   │   ├── adminController.js      # Admin: users, expenses, stats, activity
│   │   └── budgetController.js     # CRUD for monthly category budgets
│   │
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verify (protect) + role guard (adminOnly)
│   │
│   ├── models/
│   │   ├── User.js                 # Entity 1: accounts, bcrypt hook, role field
│   │   ├── Expense.js              # Entity 2: expenses with user foreign key
│   │   ├── UserActivity.js         # Entity 3: audit log (append-only)
│   │   └── Budget.js               # Entity 4: monthly category limits
│   │
│   ├── routes/
│   │   ├── authRoutes.js           # /api/auth/*  (public)
│   │   ├── expenseRoutes.js        # /api/expenses/*  (JWT required)
│   │   ├── adminRoutes.js          # /api/admin/*  (admin role required)
│   │   └── budgetRoutes.js         # /api/budgets/*  (JWT required)
│   │
│   ├── utils/
│   │   └── errorUtils.js           # Shared Mongoose error formatter
│   │
│   ├── server.js                   # Entry point: DB connect, middleware, routes
│   ├── seed.js                     # Seed script — populates DB with demo data
│   ├── promoteAdmin.js             # Utility: grant admin role by email
│   ├── .env.example                # Template for environment variables
│   └── package.json
│
├── frontend/                       # React single-page application
│   ├── public/
│   │   └── index.html              # HTML shell; React mounts into #root
│   │
│   └── src/
│       ├── components/
│       │   ├── AuthPage.js         # Login/Register tab switcher with validation
│       │   ├── ExpenseForm.js      # Add / edit expense form (shared, mode-aware)
│       │   ├── ExpenseList.js      # List with search, category filter, trend chart
│       │   ├── ExpenseItem.js      # Single expense card with edit/delete
│       │   ├── SearchBar.js        # Debounced live search input
│       │   ├── AdminPanel.js       # Admin dashboard (3 tabs)
│       │   ├── BudgetManager.js    # Set/view/delete monthly category budgets
│       │   ├── SpendingSummary.js  # Current-month overview widget
│       │   ├── Modal.js            # Custom confirm dialog (replaces window.confirm)
│       │   ├── Toast.js            # Toast notification system (Context + portal)
│       │   └── ErrorBoundary.js    # React class error boundary
│       │
│       ├── services/               # Axios API wrappers — one file per domain
│       │   ├── authService.js      # login(), register(), logout(), authAxios()
│       │   ├── expenseService.js   # CRUD wrappers for /api/expenses
│       │   ├── adminService.js     # Wrappers for /api/admin
│       │   ├── budgetService.js    # CRUD wrappers for /api/budgets
│       │   └── dateUtils.js        # Sydney-timezone date formatting helpers
│       │
│       ├── styles/                 # CSS — one file per component
│       │   ├── App.css, AuthPage.css, SearchBar.css
│       │   ├── AdminPanel.css, ExpenseList.css
│       │   ├── ExpenseItem.css, ExpenseForm.css
│       │   ├── BudgetManager.css, SpendingSummary.css
│       │   ├── Modal.css, Toast.css, ErrorBoundary.css, index.css
│       │
│       ├── App.js                  # Root: auth gate, view routing, CRUD handlers
│       └── index.js                # ReactDOM entry point
│
├── database/
│   └── sample_export.json          # Sample data for import/demo reference
│
├── WORKLOAD.md                     # Workload allocation statement
└── README.md                       # This file
```

---

## How to Run

### Prerequisites
- Node.js v16+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account with a free cluster

### 1. Backend

```bash
cd backend
npm install

# Copy the env template and fill in your values
cp .env.example .env
```

Edit `backend/.env`:
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/expensetracker
PORT=5000
JWT_SECRET=choose_a_long_random_string_at_least_32_chars
JWT_EXPIRE=7d
NODE_ENV=development
```

```bash
npm run dev       # development (nodemon auto-reload)
# or
npm start         # production
```

Backend runs at `http://localhost:5000`

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

### 3. Seed Demo Data (optional)

```bash
node backend/seed.js
```

Creates demo accounts:

| Role  | Email            | Password  |
|-------|------------------|-----------|
| Admin | admin@demo.com   | admin123  |
| User  | alice@demo.com   | alice123  |
| User  | bob@demo.com     | bob123    |

### 4. Promote an Existing Account to Admin

Edit the email in `backend/promoteAdmin.js`, then:
```bash
node backend/promoteAdmin.js
```
Log out and back in — the Admin tab will appear.

---

## API Reference

| Method   | Route                          | Auth   | Description                          |
|----------|--------------------------------|--------|--------------------------------------|
| POST     | /api/auth/register             | Public | Create account                       |
| POST     | /api/auth/login                | Public | Login, returns JWT                   |
| GET      | /api/auth/me                   | User   | Current user profile                 |
| GET      | /api/expenses?search=          | User   | Get expenses (live search supported) |
| POST     | /api/expenses                  | User   | Create expense                       |
| PUT      | /api/expenses/:id              | User   | Update own expense                   |
| DELETE   | /api/expenses/:id              | User   | Delete own expense                   |
| GET      | /api/budgets?month=&year=      | User   | Get budgets with actual spending     |
| POST     | /api/budgets                   | User   | Create/upsert a budget               |
| PUT      | /api/budgets/:id               | User   | Update budget limit                  |
| DELETE   | /api/budgets/:id               | User   | Delete a budget                      |
| GET      | /api/admin/stats               | Admin  | Dashboard summary + category chart   |
| GET      | /api/admin/users               | Admin  | All users with expense stats         |
| GET      | /api/admin/users/:id/expenses  | Admin  | One user's expenses                  |
| PUT      | /api/admin/users/:id           | Admin  | Update role or status                |
| DELETE   | /api/admin/users/:id           | Admin  | Delete user and all their data       |
| PUT      | /api/admin/expenses/:id        | Admin  | Edit any expense                     |
| DELETE   | /api/admin/expenses/:id        | Admin  | Delete any expense                   |
| GET      | /api/admin/activities          | Admin  | Full activity log (last 200 entries) |

---

## Security

- Passwords hashed with **bcrypt** (cost factor 10) — never stored in plain text
- **JWT** tokens signed with `JWT_SECRET` from environment variables — never hardcoded
- All protected routes verified by `protect` middleware; admin routes additionally gated by `adminOnly`
- Login error messages are intentionally vague ("Invalid email or password") to prevent user enumeration
- Inactive accounts are rejected at both login and on every JWT-protected request
- Users can only access/modify their own expenses — user ID is always taken from `req.user`, never from the request body

---

## Environment Variables

All secrets are in `.env` files excluded from version control (see `.gitignore`). The `.env.example` file documents every required variable with placeholder values.
