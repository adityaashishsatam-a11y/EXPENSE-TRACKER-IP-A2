/**
 * AdminPanel Component
 * Author: Aditya Ashish Satam (25402847)
 *
 * Full administrative interface with three tabs:
 *   1. Dashboard  — Summary stats, month-over-month comparison, category breakdown chart
 *   2. Users      — Table of all users with inline actions; drill-down to view expenses
 *   3. Activity   — Chronological log of all login, register, and expense events
 *
 * Design decisions:
 *  - useCallback wraps each data-loading function so useEffect dependencies are
 *    stable — avoids infinite re-render loops when loadX is in a dep array.
 *  - Tab switching triggers the appropriate data load via useEffect watching [tab].
 *  - Success/error feedback is delivered via the injected showToast prop instead
 *    of local state banners, keeping the component's state simpler.
 *  - Custom Modal replaces window.confirm() for destructive actions (delete user,
 *    delete expense) — more accessible, consistent styling, non-blocking.
 *  - Cascade delete (user + their expenses + activities) happens server-side;
 *    this component just removes the row from local state on success.
 *  - Category breakdown chart uses CSS-only horizontal bars (no chart library
 *    needed) — proportional widths relative to the highest-spending category.
 *
 * Props:
 *   currentUser — the logged-in admin's user object
 *   showToast   — toast notification function injected from App via ToastContext
 */

import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import {
  getStats, getAllUsers, getUserExpenses,
  updateUser, deleteUser, adminDeleteExpense, getActivities
} from '../services/adminService';
import '../styles/AdminPanel.css';

const CATEGORY_COLORS = {
  Food:           '#f6ad55',
  Transportation: '#63b3ed',
  Entertainment:  '#fc8181',
  Utilities:      '#68d391',
  Healthcare:     '#b794f4',
  Shopping:       '#f687b3',
  Other:          '#a0aec0'
};

const AdminPanel = ({ currentUser, showToast }) => {
  const [tab, setTab]               = useState('dashboard');
  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedUser, setSelectedUser]     = useState(null);
  const [userExpenses, setUserExpenses]     = useState([]);
  const [loading, setLoading]       = useState(false);

  // Modal state: { open, title, message, onConfirm }
  const [modal, setModal] = useState({ open: false });

  const openModal = (title, message, onConfirm, confirmText = 'Confirm') => {
    setModal({ open: true, title, message, onConfirm, confirmText });
  };
  const closeModal = () => setModal({ open: false });

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setStats(await getStats());
    } catch {
      showToast('Failed to load dashboard stats.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setUsers(await getAllUsers());
    } catch {
      showToast('Failed to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setActivities(await getActivities());
    } catch {
      showToast('Failed to load activity log.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (tab === 'dashboard')   loadStats();
    else if (tab === 'users')  loadUsers();
    else if (tab === 'activities') loadActivities();
  }, [tab, loadStats, loadUsers, loadActivities]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleViewExpenses = async (user) => {
    try {
      setLoading(true);
      const data = await getUserExpenses(user._id);
      setUserExpenses(data.expenses);
      setSelectedUser(user);
    } catch {
      showToast('Failed to load expenses for this user.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    openModal(
      `${newRole === 'admin' ? 'Promote' : 'Demote'} User`,
      `${newRole === 'admin' ? 'Grant admin access to' : 'Remove admin access from'} "${user.name}"?`,
      async () => {
        closeModal();
        try {
          const updated = await updateUser(user._id, { role: newRole });
          setUsers(prev => prev.map(u => u._id === user._id ? { ...u, role: updated.role } : u));
          showToast(`${user.name} is now ${newRole}.`, 'success');
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to update role.', 'error');
        }
      },
      newRole === 'admin' ? 'Promote' : 'Demote'
    );
  };

  const handleToggleActive = async (user) => {
    const action = user.isActive ? 'Deactivate' : 'Activate';
    openModal(
      `${action} Account`,
      `${action} "${user.name}"'s account?`,
      async () => {
        closeModal();
        try {
          const updated = await updateUser(user._id, { isActive: !user.isActive });
          setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: updated.isActive } : u));
          showToast(`${user.name} has been ${updated.isActive ? 'activated' : 'deactivated'}.`, 'success');
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to update account status.', 'error');
        }
      },
      action
    );
  };

  const handleDeleteUser = (user) => {
    openModal(
      'Delete User',
      `Permanently delete "${user.name}" and ALL their expenses?\nThis action cannot be undone.`,
      async () => {
        closeModal();
        try {
          await deleteUser(user._id);
          setUsers(prev => prev.filter(u => u._id !== user._id));
          if (selectedUser?._id === user._id) setSelectedUser(null);
          showToast(`${user.name} has been deleted.`, 'info');
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to delete user.', 'error');
        }
      },
      'Delete'
    );
  };

  const handleDeleteExpense = (expenseId) => {
    openModal(
      'Delete Expense',
      'Permanently delete this expense? This cannot be undone.',
      async () => {
        closeModal();
        try {
          await adminDeleteExpense(expenseId);
          setUserExpenses(prev => prev.filter(e => e._id !== expenseId));
          showToast('Expense deleted.', 'info');
        } catch {
          showToast('Failed to delete expense.', 'error');
        }
      },
      'Delete'
    );
  };

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

      {loading && <div className="admin-loading" aria-live="polite">Loading…</div>}

      {/* ── DASHBOARD TAB ── */}
      {tab === 'dashboard' && stats && !loading && (
        <div className="dashboard-content">
          {/* Top stat cards */}
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
              <div className="stat-label">All-Time Spent</div>
            </div>
            <div className="stat-card stat-card-accent">
              <div className="stat-number">${stats.spentThisMonth.toFixed(2)}</div>
              <div className="stat-label">
                This Month
                {stats.spentLastMonth > 0 && (
                  <span className={`stat-change ${stats.spentThisMonth > stats.spentLastMonth ? 'change-up' : 'change-down'}`}>
                    {stats.spentThisMonth > stats.spentLastMonth ? '▲' : '▼'}
                    {Math.abs(((stats.spentThisMonth - stats.spentLastMonth) / stats.spentLastMonth) * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category breakdown chart */}
          {stats.categoryBreakdown?.length > 0 && (
            <div className="category-chart-card">
              <h3>Spending by Category (All Time)</h3>
              <div className="category-chart">
                {stats.categoryBreakdown.map((c, i) => {
                  const maxTotal = stats.categoryBreakdown[0].total;
                  const barWidth = (c.total / maxTotal) * 100;
                  return (
                    <div key={c.category} className="chart-row">
                      <span className="chart-label">{c.category}</span>
                      <div className="chart-bar-wrap">
                        <div
                          className="chart-bar"
                          style={{
                            width: `${barWidth}%`,
                            background: CATEGORY_COLORS[c.category] || '#a0aec0'
                          }}
                        />
                      </div>
                      <span className="chart-amount">${c.total.toFixed(2)}</span>
                      <span className="chart-count muted">({c.count})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent registrations */}
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

      {/* Shared confirmation modal for all destructive actions */}
      <Modal
        isOpen={modal.open}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText || 'Confirm'}
        cancelText="Cancel"
        variant="danger"
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
      />
    </div>
  );
};

export default AdminPanel;
