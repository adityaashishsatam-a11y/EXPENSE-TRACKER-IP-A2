# Workload Allocation — Assignment 2

**Subject:** Internet Programming (31748/32516)
**Assignment:** Assignment 2 — Advanced Website Based on Modern Front-end Libraries

| Member | Student ID | GitHub |
|--------|-----------|--------|
| Aditya Ashish Satam | 25402847 | adityasatam-a11y |
| Harshali Tambadkar  | 25543582   | harshalitambadkar-cmd |

**GitHub Repository:** https://github.com/adityaashishsatam-a11y/EXPENSE-TRACKER-IP-A2

Contributions are tracked via Git commit authorship. Each commit is attributed to the responsible author using the `--author` flag so that `git log --author="Aditya"` and `git log --author="Harshali"` reflect the split below. Commit history is publicly visible on the repository linked above.

---

## Summary

- **Aditya** — Backend architecture, data models, authentication system, expense CRUD API
- **Harshali** — Admin backend functionality, all frontend UI components and styling

---

## File-Level Attribution

### Aditya Ashish Satam — Backend Core & Models

| File | Description |
|------|-------------|
| `backend/server.js` | Express entry point — DB connect, middleware, route registration |
| `backend/models/User.js` | User schema with bcrypt pre-save hook and role field |
| `backend/models/Expense.js` | Expense schema with user foreign key and category enum |
| `backend/models/UserActivity.js` | Audit log model (append-only, populated by controllers) |
| `backend/models/Budget.js` | Monthly category budget limits — fourth entity |
| `backend/controllers/authController.js` | Register, login, getMe with JWT signing |
| `backend/controllers/expenseController.js` | Full CRUD + live search scoped to authenticated user |
| `backend/controllers/budgetController.js` | CRUD for monthly budgets with actual-spend aggregation |
| `backend/routes/authRoutes.js` | Public auth routes |
| `backend/routes/expenseRoutes.js` | Protected expense routes (JWT required) |
| `backend/routes/budgetRoutes.js` | Protected budget routes (JWT required) |
| `backend/middleware/authMiddleware.js` | JWT verify (`protect`) and role guard (`adminOnly`) |
| `backend/utils/errorUtils.js` | Shared Mongoose error formatter |
| `backend/seed.js` | Database seed script with demo users, expenses, budgets |
| `backend/promoteAdmin.js` | Utility to grant admin role by email |
| `backend/package.json` | Backend dependencies |
| `backend/.env.example` | Environment variable template |
| `README.md` | Full project documentation |
| `WORKLOAD.md` | This file |
| `database/sample_export.json` | Sample data export for submission |

### Harshali Tambadkar — Admin Backend & All Frontend

| File | Description |
|------|-------------|
| `backend/controllers/adminController.js` | Admin: user management, stats, category breakdown chart, activity log |
| `backend/routes/adminRoutes.js` | Admin-only routes (JWT + adminOnly middleware) |
| `frontend/src/App.js` | Root: auth gate, view routing, CRUD handlers, CSV export, Toast integration |
| `frontend/src/index.js` | ReactDOM entry point |
| `frontend/src/components/AuthPage.js` | Login/Register tab switcher with validation |
| `frontend/src/components/ExpenseForm.js` | Add/edit form — mode-aware, Sydney-timezone date logic |
| `frontend/src/components/ExpenseList.js` | Expense list with live search, category filter, monthly trend |
| `frontend/src/components/ExpenseItem.js` | Individual expense card with custom Modal delete confirmation |
| `frontend/src/components/SearchBar.js` | Debounced live search input (300 ms, custom useRef timer) |
| `frontend/src/components/AdminPanel.js` | Admin dashboard — 3 tabs, category chart, modal confirmations |
| `frontend/src/components/BudgetManager.js` | Set/view/edit/delete monthly category budgets with progress bars |
| `frontend/src/components/SpendingSummary.js` | Current-month widget with category breakdown and budget badges |
| `frontend/src/components/Modal.js` | Custom confirm dialog (React portal, Escape key, backdrop close) |
| `frontend/src/components/Toast.js` | Toast system — Context + useReducer + auto-dismiss |
| `frontend/src/components/ErrorBoundary.js` | Class-based React error boundary |
| `frontend/src/services/authService.js` | login(), register(), logout(), authAxios() factory |
| `frontend/src/services/expenseService.js` | Axios wrappers for /api/expenses |
| `frontend/src/services/adminService.js` | Axios wrappers for /api/admin |
| `frontend/src/services/budgetService.js` | Axios wrappers for /api/budgets |
| `frontend/src/services/dateUtils.js` | Sydney-timezone date formatting helpers |
| `frontend/src/styles/*.css` | All component-scoped CSS files |
| `frontend/public/index.html` | HTML shell |
| `frontend/.env` | Frontend environment variable |
| `.gitignore` | Git ignore rules |

### Documentation and Data

| File | Author | Description |
|------|--------|-------------|
| `README.md` | Aditya | Full project documentation |
| `WORKLOAD.md` | Aditya | This file |
| `database/sample_export.json` | Aditya | Sample data export for submission |

---

## Technical Design Rationale

### useState vs useReducer vs useRef

- **useState** is used for all straightforward local UI state (form fields, loading flags, error messages, modal open/close). Transitions are simple and independent.
- **useReducer** is used in `Toast.js` for the toast queue. The "add / remove toast" transitions are explicit named actions and the list grows/shrinks in any order — a reducer makes the logic readable and easy to extend.
- **useRef** is used in `SearchBar.js` to hold the debounce timer ID. Changing a ref does not trigger a re-render, which is correct — the timer ID is an implementation detail, not display state.
- **useCallback** wraps all data-fetching functions used as `useEffect` dependencies (`fetchExpenses`, `fetchBudgets` in `App.js`). Without it, a new function reference on every render would cause the effect to re-fire infinitely.
- **useMemo** is used in `ExpenseList.js` and `SpendingSummary.js` for derived values (filtered list, category totals, monthly trend). These iterate over potentially large arrays; memoising avoids recomputing on every unrelated render.

### Security

- **Password hashing**: bcrypt (cost factor 10) in a Mongoose pre-save hook — plain-text passwords are never stored or logged.
- **JWT**: signed with `JWT_SECRET` from environment variables. Expiry configurable via `JWT_EXPIRE`.
- **Route protection**: `protect` middleware re-fetches the user from MongoDB on every request, rejecting tokens for deleted or deactivated accounts even if the token itself is still valid.
- **Admin guard**: `adminOnly` returns 403 (Forbidden) rather than 401 (Unauthorised) — the user is authenticated, just not permitted.
- **Data isolation**: every expense and budget query includes `user: req.user._id` — a valid token cannot access another user's data.
- **Enumeration prevention**: login returns the same vague message for "email not found" and "wrong password" to prevent attackers from discovering registered emails.