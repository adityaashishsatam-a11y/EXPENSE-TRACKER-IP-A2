/**
 * BudgetManager Component
 * Author: Aditya Ashish Satam (25402847)
 *
 * Allows users to create, view, edit, and delete monthly spending limits
 * per expense category.  Each budget card shows:
 *   - Category name and monthly limit
 *   - Actual amount spent in that category this month (from the API)
 *   - A progress bar that fills proportionally (turns red at 100%)
 *   - Remaining budget or overspend amount
 *
 * State decisions:
 *   - useState for all form + UI state; no global store needed since
 *     BudgetManager is a self-contained panel.
 *   - editingId tracks which budget is in inline-edit mode so only one
 *     edit form is open at a time.
 *   - The form data for "add budget" and "edit budget" share a single
 *     formData state object, reset on mode change.
 *
 * Props:
 *   month      — currently viewed month (1–12)
 *   year       — currently viewed year
 *   onUpdate   — callback() called after any change so the parent can
 *                re-fetch expenses and refresh budget progress elsewhere
 *   showToast  — injected toast notification function from ToastContext
 */

import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../services/budgetService';
import '../styles/BudgetManager.css';

const CATEGORIES = [
  'Food', 'Transportation', 'Entertainment',
  'Utilities', 'Healthcare', 'Shopping', 'Other'
];

const CATEGORY_EMOJIS = {
  Food:           '🍔',
  Transportation: '🚗',
  Entertainment:  '🎬',
  Utilities:      '💡',
  Healthcare:     '💊',
  Shopping:       '🛍️',
  Other:          '📦'
};

const EMPTY_FORM = { category: 'Food', monthlyLimit: '' };

const BudgetManager = ({ month, year, onUpdate, showToast }) => {
  const [budgets, setBudgets]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState(EMPTY_FORM);
  const [editingId, setEditingId]   = useState(null);
  const [editLimit, setEditLimit]   = useState('');
  const [formError, setFormError]   = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, budget: null });

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBudgets(month, year);
      setBudgets(data);
    } catch {
      showToast('Failed to load budgets.', 'error');
    } finally {
      setLoading(false);
    }
  }, [month, year, showToast]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError('');

    const limit = parseFloat(formData.monthlyLimit);
    if (!formData.category) { setFormError('Please select a category.'); return; }
    if (!limit || limit <= 0) { setFormError('Limit must be a positive number.'); return; }

    try {
      const saved = await createBudget({ ...formData, monthlyLimit: limit, month, year });
      // Upsert: replace existing or prepend new
      setBudgets(prev => {
        const idx = prev.findIndex(b => b._id === saved._id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      setFormData(EMPTY_FORM);
      setShowForm(false);
      showToast(`Budget set for ${saved.category}!`, 'success');
      if (onUpdate) onUpdate();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save budget.');
    }
  };

  const startEdit = (b) => {
    setEditingId(b._id);
    setEditLimit(b.monthlyLimit.toString());
  };

  const handleEditSave = async (budget) => {
    const limit = parseFloat(editLimit);
    if (!limit || limit <= 0) { showToast('Limit must be a positive number.', 'error'); return; }

    try {
      const updated = await updateBudget(budget._id, limit);
      setBudgets(prev => prev.map(b => b._id === budget._id ? { ...b, ...updated } : b));
      setEditingId(null);
      showToast('Budget updated!', 'success');
      if (onUpdate) onUpdate();
    } catch {
      showToast('Failed to update budget.', 'error');
    }
  };

  const confirmDelete = (budget) => {
    setDeleteModal({ open: true, budget });
  };

  const handleDelete = async () => {
    const { budget } = deleteModal;
    setDeleteModal({ open: false, budget: null });
    try {
      await deleteBudget(budget._id);
      setBudgets(prev => prev.filter(b => b._id !== budget._id));
      showToast(`Budget for "${budget.category}" removed.`, 'info');
      if (onUpdate) onUpdate();
    } catch {
      showToast('Failed to delete budget.', 'error');
    }
  };

  // Which categories don't have a budget yet? (for the add form dropdown)
  const usedCategories = budgets.map(b => b.category);
  const availableCategories = CATEGORIES.filter(c => !usedCategories.includes(c));

  // ── Render ─────────────────────────────────────────────────────────────────

  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  return (
    <div className="budget-manager">
      <div className="budget-header">
        <h3>📊 Monthly Budgets — {monthLabel}</h3>
        {availableCategories.length > 0 && !showForm && (
          <button className="btn-add-budget" onClick={() => { setShowForm(true); setFormError(''); }}>
            + Set Budget
          </button>
        )}
      </div>

      {/* Add Budget Form */}
      {showForm && (
        <form className="budget-form" onSubmit={handleAdd}>
          {formError && <div className="budget-form-error">{formError}</div>}
          <div className="budget-form-row">
            <select
              value={formData.category}
              onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
            >
              {availableCategories.map(c => (
                <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {c}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Monthly limit ($)"
              value={formData.monthlyLimit}
              onChange={e => {
                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value))
                  setFormData(p => ({ ...p, monthlyLimit: e.target.value }));
              }}
              inputMode="decimal"
            />
            <button type="submit" className="btn-save-budget">Save</button>
            <button type="button" className="btn-cancel-budget"
              onClick={() => { setShowForm(false); setFormData(EMPTY_FORM); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Budget Cards */}
      {loading ? (
        <p className="budget-loading">Loading budgets…</p>
      ) : budgets.length === 0 ? (
        <div className="budget-empty">
          <p>No budgets set for this month.</p>
          <p className="budget-empty-sub">
            Set a budget to track your spending against your goals.
          </p>
        </div>
      ) : (
        <div className="budget-list">
          {budgets.map(b => {
            const pct        = Math.min((b.actualSpent / b.monthlyLimit) * 100, 100);
            const overBudget = b.actualSpent > b.monthlyLimit;
            const remaining  = b.monthlyLimit - b.actualSpent;

            return (
              <div key={b._id} className={`budget-card ${overBudget ? 'over-budget' : ''}`}>
                <div className="budget-card-header">
                  <span className="budget-category">
                    {CATEGORY_EMOJIS[b.category]} {b.category}
                  </span>

                  {editingId === b._id ? (
                    <div className="budget-inline-edit">
                      <span className="edit-label">$</span>
                      <input
                        type="text"
                        className="edit-limit-input"
                        value={editLimit}
                        onChange={e => {
                          if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value))
                            setEditLimit(e.target.value);
                        }}
                        inputMode="decimal"
                        autoFocus
                      />
                      <button className="btn-sm-save" onClick={() => handleEditSave(b)}>✓</button>
                      <button className="btn-sm-cancel" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="budget-actions-right">
                      <span className="budget-limit-label">
                        Limit: <strong>${b.monthlyLimit.toFixed(2)}</strong>
                      </span>
                      <button className="btn-sm-icon" onClick={() => startEdit(b)} title="Edit limit">✏️</button>
                      <button className="btn-sm-icon btn-sm-del" onClick={() => confirmDelete(b)} title="Delete">🗑️</button>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="budget-bar-wrap" aria-label={`${Math.round(pct)}% used`}>
                  <div
                    className={`budget-bar ${overBudget ? 'budget-bar-over' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="budget-card-footer">
                  <span>Spent: <strong>${b.actualSpent.toFixed(2)}</strong></span>
                  <span className={overBudget ? 'over-text' : 'under-text'}>
                    {overBudget
                      ? `Over by $${Math.abs(remaining).toFixed(2)}`
                      : `$${remaining.toFixed(2)} remaining`}
                  </span>
                  <span className="budget-pct">{Math.round(pct)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModal.open}
        title="Delete Budget"
        message={`Remove the budget for "${deleteModal.budget?.category}"?\nThis will not delete any expenses.`}
        confirmText="Delete"
        cancelText="Keep"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, budget: null })}
      />
    </div>
  );
};

export default BudgetManager;
