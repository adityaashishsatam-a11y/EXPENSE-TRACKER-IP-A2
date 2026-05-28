/* Author: Harshali Tambadkar (25543582) */
/**
 * App.js — Root Component
 * Author: Aditya Ashish Satam (25402847)
 *
 * Manages top-level application state and acts as the view router:
 *   - Unauthenticated: renders <AuthPage /> (login/register)
 *   - Authenticated user: shows three tabs — Expenses, Budget, and (admin) Admin
 *   - Admin: additionally has access to the full admin panel
 *
 * State decisions:
 *   - useState for all local UI state; no global store needed at this scale.
 *   - useCallback wraps fetchExpenses, fetchBudgets, and handleSearch so their
 *     references are stable across renders — prevents child components that
 *     receive them as props from re-rendering unnecessarily.
 *   - searchQuery is lifted here so the useEffect watching it can trigger
 *     server-side re-fetches.
 *
 * Auth persistence:
 *   - JWT and user object are stored in localStorage by authService.
 *   - On mount, getUser() restores the session so users stay logged in on refresh.
 *
 * CSV Export:
 *   - Built client-side from the current expense array; no extra API call.
 *   - Constructs a Blob and triggers a download via a temporary <a> element.
 *
 * ToastProvider wraps the whole tree so any component can call useToast().
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import AuthPage        from './components/AuthPage';
import ExpenseForm     from './components/ExpenseForm';
import ExpenseList     from './components/ExpenseList';
import AdminPanel      from './components/AdminPanel';
import BudgetManager   from './components/BudgetManager';
import SpendingSummary from './components/SpendingSummary';
import { getUser, logout } from './services/authService';
import {
  createExpense, getExpenses, updateExpense, deleteExpense
} from './services/expenseService';
import { getBudgets } from './services/budgetService';
import './styles/App.css';

// ── Inner app (needs access to useToast, so nested inside ToastProvider) ──────

const AppInner = () => {
  const { showToast } = useToast();

  const [user, setUser]                     = useState(null);
  const [view, setView]                     = useState('expenses'); // 'expenses' | 'budget' | 'admin'
  const [expenses, setExpenses]             = useState([]);
  const [budgets, setBudgets]               = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showForm, setShowForm]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [searchQuery, setSearchQuery]       = useState('');

  // Derive current month/year for budget queries
  const now          = new Date();
  const currentMonth = now.getMonth() + 1;   // 1-indexed
  const currentYear  = now.getFullYear();

  // Restore session from localStorage on initial mount
  useEffect(() => {
    const savedUser = getUser();
    if (savedUser) setUser(savedUser);
  }, []);

  // ── Data fetching ───────────────────────────────────────────────────────────

  /**
   * Fetches expenses, optionally filtered by the search query.
   * Wrapped in useCallback for a stable reference in useEffect dependencies.
   */
  const fetchExpenses = useCallback(async (search = '') => {
    try {
      setLoading(true);
      setError('');
      const data = await getExpenses(search);
      setExpenses(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load expenses. Please check your connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetches the current month's budgets from the API.
   * Called on mount, after budget changes, and after any expense CRUD
   * (because actualSpent values embedded in budget documents need refreshing).
   */
  const fetchBudgets = useCallback(async () => {
    try {
      const data = await getBudgets(currentMonth, currentYear);
      setBudgets(data);
    } catch {
      // Budgets are supplementary — a fetch failure shouldn't block the app
      setBudgets([]);
    }
  }, [currentMonth, currentYear]);

  // Re-fetch whenever the user logs in, switches to expense view, or searches
  useEffect(() => {
    if (user && view === 'expenses') {
      fetchExpenses(searchQuery);
      fetchBudgets();
    }
  }, [user, view, fetchExpenses, fetchBudgets, searchQuery]);

  // Also fetch budgets when switching to budget tab (in case data changed)
  useEffect(() => {
    if (user && view === 'budget') {
      fetchBudgets();
    }
  }, [user, view, fetchBudgets]);

  // ── Auth handlers ───────────────────────────────────────────────────────────

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    showToast(`Welcome back, ${loggedInUser.name}!`, 'success');
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setExpenses([]);
    setBudgets([]);
    setShowForm(false);
    setEditingExpense(null);
    setView('expenses');
    setSearchQuery('');
    setError('');
  };

  // ── Expense CRUD ────────────────────────────────────────────────────────────

  /**
   * handleSearch is passed to ExpenseList → SearchBar.
   * The 300ms debounce lives inside SearchBar; this is called at most once
   * per debounce burst.
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleAddExpense = async (formData) => {
    try {
      setError('');
      const newExpense = await createExpense(formData);
      setExpenses(prev => [newExpense, ...prev]);
      setShowForm(false);
      showToast('Expense added!', 'success');
      fetchBudgets(); // Refresh actualSpent values in budget list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense. Please try again.');
    }
  };

  const handleEditExpense = async (formData) => {
    try {
      setError('');
      const updated = await updateExpense(editingExpense._id, formData);
      setExpenses(prev => prev.map(e => e._id === editingExpense._id ? updated : e));
      setEditingExpense(null);
      setShowForm(false);
      showToast('Expense updated!', 'success');
      fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update expense. Please try again.');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      setError('');
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e._id !== id));
      showToast('Expense deleted.', 'info');
      fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense. Please try again.');
    }
  };

  const handleSelectEdit = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
    setTimeout(() => {
      const formSection = document.querySelector('.form-section');
      if (formSection) {
        window.scrollTo({
          top: formSection.getBoundingClientRect().top + window.scrollY - 30,
          behavior: 'smooth'
        });
      }
    }, 150);
  };

  const handleCancelForm = () => {
    setEditingExpense(null);
    setShowForm(false);
  };

  // ── CSV Export ──────────────────────────────────────────────────────────────

  /**
   * Converts the current expense list to a CSV string and triggers a browser
   * download.  Works entirely client-side — no API call needed because the
   * parent already holds all the data.
   * Using a Blob + Object URL avoids any server round-trip and works in all
   * modern browsers without a library.
   */
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      showToast('No expenses to export.', 'info');
      return;
    }

    const headers = ['Title', 'Category', 'Amount', 'Date', 'Description'];
    const rows = expenses.map(e => [
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      e.amount.toFixed(2),
      new Date(e.date).toLocaleDateString('en-CA'),   // YYYY-MM-DD
      `"${(e.description || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);

    const link    = document.createElement('a');
    link.href     = url;
    link.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${expenses.length} expense${expenses.length !== 1 ? 's' : ''}.`, 'success');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  const tabs = [
    { key: 'expenses', label: '📊 My Expenses' },
    { key: 'budget',   label: '🎯 Budgets' },
    ...(user.role === 'admin' ? [{ key: 'admin', label: '🛡️ Admin' }] : [])
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>💰 Expense Tracker</h1>
          <p className="tagline">Manage and track your expenses with ease</p>
        </div>

        <nav className="header-nav" aria-label="Main navigation">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              className={`nav-btn ${view === key ? 'active' : ''}`}
              onClick={() => setView(key)}
              aria-current={view === key ? 'page' : undefined}
            >
              {label}
            </button>
          ))}

          <div className="user-info">
            <span className="user-greeting">
              👤 {user.name}
              {user.role === 'admin' && <span className="admin-badge">Admin</span>}
            </span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button className="close-error" onClick={() => setError('')} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        <div className="container">
          {/* ── Admin tab ── */}
          {view === 'admin' && user.role === 'admin' && (
            <AdminPanel currentUser={user} showToast={showToast} />
          )}

          {/* ── Budget tab ── */}
          {view === 'budget' && (
            <BudgetManager
              month={currentMonth}
              year={currentYear}
              onUpdate={fetchBudgets}
              showToast={showToast}
            />
          )}

          {/* ── Expenses tab ── */}
          {view === 'expenses' && (
            <>
              {/* Spending overview widget — only shown when there is data */}
              {expenses.length > 0 && (
                <SpendingSummary expenses={expenses} budgets={budgets} />
              )}

              {/* Add / Edit form */}
              {showForm ? (
                <div className="form-section">
                  <ExpenseForm
                    onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
                    initialData={editingExpense}
                    onCancel={handleCancelForm}
                  />
                </div>
              ) : (
                <div className="expense-actions-bar">
                  <button
                    className="btn-add-expense"
                    onClick={() => { setShowForm(true); setEditingExpense(null); }}
                  >
                    + Add New Expense
                  </button>
                  {expenses.length > 0 && (
                    <button className="btn-export-csv" onClick={handleExportCSV} title="Download as CSV">
                      ⬇ Export CSV
                    </button>
                  )}
                </div>
              )}

              <div className="list-section">
                <ExpenseList
                  expenses={expenses}
                  budgets={budgets}
                  onEdit={handleSelectEdit}
                  onDelete={handleDeleteExpense}
                  loading={loading}
                  onSearch={handleSearch}
                  showToast={showToast}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Expense Tracker © 2025 | Aditya Ashish Satam — UTS Internet Programming Assignment 2</p>
      </footer>
    </div>
  );
};

// ── Root export wraps the inner app with ToastProvider ──────────────────────

const App = () => (
  <ToastProvider>
    <AppInner />
  </ToastProvider>
);

export default App;
