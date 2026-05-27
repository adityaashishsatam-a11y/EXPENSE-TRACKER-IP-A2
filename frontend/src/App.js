/**
 * App.js — Root Component
 *
 * Manages top-level application state and acts as the router between views:
 *   - Unauthenticated: renders <AuthPage /> (login/register)
 *   - Authenticated user: renders expense tracker view
 *   - Authenticated admin: additionally shows the Admin Panel tab
 *
 * State decisions:
 *   - useState for all local UI state (simple, no global store needed at this scale)
 *   - useCallback wraps fetchExpenses and handleSearch to prevent unnecessary
 *     re-renders of child components that receive them as props
 *   - searchQuery is lifted here (not in ExpenseList) so the effect that triggers
 *     API calls can watch it as a dependency
 *
 * Auth persistence:
 *   - JWT and user object are stored in localStorage by authService
 *   - On mount, getUser() restores the session so users stay logged in on refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import AuthPage from './components/AuthPage';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import AdminPanel from './components/AdminPanel';
import { getUser, logout } from './services/authService';
import { createExpense, getExpenses, updateExpense, deleteExpense } from './services/expenseService';
import './styles/App.css';

const App = () => {
  const [user, setUser]                   = useState(null);
  const [view, setView]                   = useState('expenses'); // 'expenses' | 'admin'
  const [expenses, setExpenses]           = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showForm, setShowForm]           = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [searchQuery, setSearchQuery]     = useState('');

  // Restore session from localStorage on initial mount
  useEffect(() => {
    const savedUser = getUser();
    if (savedUser) setUser(savedUser);
  }, []);

  /**
   * Fetches expenses from the API, optionally filtered by a search string.
   * Wrapped in useCallback so it's a stable reference for useEffect dependencies.
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

  // Re-fetch whenever the user logs in, switches to expense view, or changes search
  useEffect(() => {
    if (user && view === 'expenses') {
      fetchExpenses(searchQuery);
    }
  }, [user, view, fetchExpenses, searchQuery]);

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    logout();
    // Reset all state to initial values on logout
    setUser(null);
    setExpenses([]);
    setShowForm(false);
    setEditingExpense(null);
    setView('expenses');
    setSearchQuery('');
    setError('');
  };

  /**
   * Passed to ExpenseList → SearchBar. The debounce lives inside SearchBar,
   * so this handler is called at most once per 300ms burst of keystrokes.
   * useCallback prevents SearchBar from re-rendering on every parent re-render.
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleAddExpense = async (formData) => {
    try {
      setError('');
      const newExpense = await createExpense(formData);
      // Prepend to list so the newest expense appears at the top immediately
      setExpenses(prev => [newExpense, ...prev]);
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense. Please try again.');
    }
  };

  const handleEditExpense = async (formData) => {
    try {
      setError('');
      const updated = await updateExpense(editingExpense._id, formData);
      // Replace the old version in the list with the updated document
      setExpenses(prev => prev.map(e => e._id === editingExpense._id ? updated : e));
      setEditingExpense(null);
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update expense. Please try again.');
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      setError('');
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense. Please try again.');
    }
  };

  const handleSelectEdit = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
    // Smooth scroll to the form after its enter animation begins
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

  // Show auth screen until a user session is present
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>💰 Expense Tracker</h1>
          <p className="tagline">Manage and track your expenses with ease</p>
        </div>

        <nav className="header-nav" aria-label="Main navigation">
          {/* Admin-only tab — only rendered for admin role users */}
          {user.role === 'admin' && (
            <>
              <button
                className={`nav-btn ${view === 'expenses' ? 'active' : ''}`}
                onClick={() => setView('expenses')}
                aria-current={view === 'expenses' ? 'page' : undefined}
              >
                📊 My Expenses
              </button>
              <button
                className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
                onClick={() => setView('admin')}
                aria-current={view === 'admin' ? 'page' : undefined}
              >
                🛡️ Admin
              </button>
            </>
          )}

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
        {/* Global error banner — dismissible */}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button className="close-error" onClick={() => setError('')} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}

        <div className="container">
          {view === 'admin' && user.role === 'admin' ? (
            <AdminPanel currentUser={user} />
          ) : (
            <>
              {showForm ? (
                <div className="form-section">
                  <ExpenseForm
                    onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
                    initialData={editingExpense}
                    onCancel={handleCancelForm}
                  />
                </div>
              ) : (
                <button
                  className="btn-add-expense"
                  onClick={() => { setShowForm(true); setEditingExpense(null); }}
                >
                  + Add New Expense
                </button>
              )}

              <div className="list-section">
                <ExpenseList
                  expenses={expenses}
                  onEdit={handleSelectEdit}
                  onDelete={handleDeleteExpense}
                  loading={loading}
                  onSearch={handleSearch}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Expense Tracker © 2025 | Web Development Assignment</p>
      </footer>
    </div>
  );
};

export default App;
