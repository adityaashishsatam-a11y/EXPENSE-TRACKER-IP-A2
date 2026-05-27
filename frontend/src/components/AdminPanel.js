/**
 * AdminPanel Component
 *
 * Full administrative interface with three tabs:
 *   1. Dashboard  — Summary stats (total users, expenses, spending)
 *   2. Users      — Table of all users with inline actions; drill-down to view/delete their expenses
 *   3. Activity   — Chronological log of all login, register, and expense events
 *
 * Design decisions:
 *  - useCallback wraps each data-loading function to prevent them from being
 *    recreated on every render, keeping useEffect dependencies stable
 *  - Tab switching triggers the appropriate data load via useEffect watching [tab]
 *  - Success messages auto-dismiss after 3 seconds using setTimeout
 *  - window.confirm() is used for destructive actions (delete) as a simple,
 *    accessible confirmation mechanism without adding a modal library
 *  - Cascade delete (user + their expenses + their activities) happens server-side;
 *    this component just removes the user row from local state on success
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getStats, getAllUsers, getUserExpenses,
  updateUser, deleteUser, adminDeleteExpense, getActivities
} from '../services/adminService';
import '../styles/AdminPanel.css';

const AdminPanel = ({ currentUser }) => {
  const [tab, setTab]               = useState('dashboard');
  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedUser, setSelectedUser]     = useState(null);
  const [userExpenses, setUserExpenses]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /** Show a success toast that auto-dismisses after 3 seconds */
  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ── Data loaders (useCallback for stable useEffect dependencies) ──────────

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setStats(await getStats());
    } catch {
      setError('Failed to load dashboard stats. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setUsers(await getAllUsers());
    } catch {
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setActivities(await getActivities());
    } catch {
      setError('Failed to load activity log. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (tab === 'dashboard') loadStats();
    else if (tab === 'users')  loadUsers();
    else if (tab === 'activities') loadActivities();
  }, [tab, loadStats, loadUsers, loadActivities]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleViewExpenses = async (user) => {
    try {
      setLoading(true);
      setError('');
      const data = await getUserExpenses(user._id);
      setUserExpenses(data.expenses);
      setSelectedUser(user);
    } catch {
      setError('Failed to load expenses for this user.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const updated = await updateUser(user._id, { role: newRole });
      // Optimistically update the local users list without a full re-fetch
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, role: updated.role } : u));
      showSuccess(`${user.name} is now ${newRole}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role.');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const updated = await updateUser(user._id, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: updated.isActive } : u));
      showSuccess(`${user.name} has been ${updated.isActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update account status.');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete "${user.name}" and ALL their expenses? This cannot be undone.`)) return;
    try {
      await deleteUser(user._id);
      setUsers(prev => prev.filter(u => u._id !== user._id));
      // Clear drill-down if the deleted user was being viewed
      if (selectedUser?._id === user._id) setSelectedUser(null);
      showSuccess(`${user.name} has been deleted.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense? This cannot be undone.')) return;
    try {
      await adminDeleteExpense(expenseId);
      setUserExpenses(prev => prev.filter(e => e._id !== expenseId));
      showSuccess('Expense deleted.');
    } catch {
      setError('Failed to delete expense.');
    }
  };

  /** Maps action enum values to human-readable emoji labels */
  const formatAction = (action) => {
    const labels = {
      login:          '🔑 Login',
      logout:         '🚪 Logout',
      register:       '✨ Register',
      create_expense: '➕ Added Expense',
      update_expense: '✏️ Updated Expense',
      delete_expense: '🗑️ Deleted Expense'
    };
    return labels[action] || action;
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setSelectedUser(null);
    setError('');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>🛡️ Admin Panel</h2>
        <div className="admin-tabs" role="tablist">
          {[
            { key: 'dashboard',  label: '📊 Dashboard' },
            { key: 'users',      label: '👥 Users' },
            { key: 'activities', label: '📋 Activity Log' }
          ].map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`admin-tab ${tab === key ? 'active' : ''}`}
              onClick={() => switchTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback banners */}
      {error      && <div className="admin-error"   role="alert" onClick={() => setError('')}>{error} <span>×</span></div>}
      {successMsg && <div className="admin-success" role="status">{successMsg}</div>}
      {loading    && <div className="admin-loading" aria-live="polite">Loading…</div>}

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && stats && !loading && (
        <div className="dashboard-content">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-number">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalExpenses}</div>
              <div className="stat-label">Total Expenses</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">${stats.totalSpent.toFixed(2)}</div>
              <div className="stat-label">Total Spent (All Users)</div>
            </div>
          </div>

          <div className="recent-users-card">
            <h3>Recent Registrations</h3>
            {stats.recentUsers.length === 0 ? (
              <p className="empty-msg">No users yet.</p>
            ) : (
              stats.recentUsers.map(u => (
                <div key={u._id} className="recent-user-row">
                  <span className="recent-name">{u.name}</span>
                  <span className="muted">{u.email}</span>
                  <span className="muted">{new Date(u.createdAt).toLocaleDateString('en-AU')}</span>
                  {u.role === 'admin' && <span className="badge badge-admin">admin</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── USERS TAB — user table ── */}
      {tab === 'users' && !selectedUser && !loading && (
        <div className="table-wrap">
          {users.length === 0 ? (
            <p className="empty-msg">No users found.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Expenses</th>
                  <th>Total Spent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className={!u.isActive ? 'row-inactive' : ''}>
                    <td>{u.name}</td>
                    <td className="muted">{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className={`badge badge-${u.isActive ? 'active' : 'inactive'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{u.expenseCount}</td>
                    <td>${u.totalSpent.toFixed(2)}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-sm btn-view" onClick={() => handleViewExpenses(u)}>
                          View
                        </button>
                        {/* Hide self-management buttons to prevent accidental lockout */}
                        {u._id !== currentUser._id && (
                          <>
                            <button className="btn-sm btn-role" onClick={() => handleToggleRole(u)}>
                              {u.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                            <button className="btn-sm btn-toggle" onClick={() => handleToggleActive(u)}>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="btn-sm btn-delete" onClick={() => handleDeleteUser(u)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── USERS TAB — expense drill-down ── */}
      {tab === 'users' && selectedUser && !loading && (
        <div className="drilldown-view">
          <button className="btn-back" onClick={() => setSelectedUser(null)}>
            ← Back to Users
          </button>
          <h3>
            Expenses for <strong>{selectedUser.name}</strong>
            <span className="muted"> ({selectedUser.email})</span>
          </h3>

          {userExpenses.length === 0 ? (
            <p className="empty-msg">This user has no expenses.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userExpenses.map(e => (
                  <tr key={e._id}>
                    <td>{e.title}</td>
                    <td>{e.category}</td>
                    <td>${e.amount.toFixed(2)}</td>
                    <td className="muted">{new Date(e.date).toLocaleDateString('en-AU')}</td>
                    <td className="muted">{e.description || '—'}</td>
                    <td>
                      <button className="btn-sm btn-delete" onClick={() => handleDeleteExpense(e._id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── ACTIVITY LOG TAB ── */}
      {tab === 'activities' && !loading && (
        <div className="table-wrap">
          {activities.length === 0 ? (
            <p className="empty-msg">No activity recorded yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Detail</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {activities.map(a => (
                  <tr key={a._id}>
                    <td>
                      {a.user?.name || <em>Deleted user</em>}
                      <br />
                      <span className="muted">{a.user?.email}</span>
                    </td>
                    <td>{formatAction(a.action)}</td>
                    <td className="muted">{a.detail}</td>
                    <td className="muted">{new Date(a.createdAt).toLocaleString('en-AU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
