/**
 * ExpenseForm Component
 *
 * Handles both creating a new expense and editing an existing one.
 * The mode is determined by whether `initialData` is provided:
 *   - No initialData  → "Add New Expense" mode, form resets after submit
 *   - With initialData → "Edit Expense" mode, form pre-populated, no reset after submit
 *
 * State decisions:
 *   - useState for formData: flat object matching the Expense schema fields.
 *     useReducer would be overkill here since all fields are independent and
 *     there is no complex derived state or multi-step logic.
 *   - useEffect syncs the form fields when initialData changes (e.g. user
 *     clicks "Edit" on a different expense without unmounting this component).
 *
 * Validation:
 *   - Client-side validation runs before the API call to give instant feedback.
 *   - Amount is kept as a string in state to preserve user input like "12.50"
 *     (a number field would strip the trailing zero). It is converted to a
 *     float only at submission time via parseFloat().
 *   - Future dates are blocked using Sydney timezone comparison to match the
 *     app's business logic (expenses cannot be pre-dated into the future).
 *
 * Props:
 *   onSubmit     — async function(formData) called on valid submit
 *   initialData  — expense object for edit mode, or null for create mode
 *   onCancel     — callback to close/hide the form
 */

import React, { useState, useEffect } from 'react';
import '../styles/ExpenseForm.css';
import { getTodayInSydney, getDateInSydney, getMaxDateForInput } from '../services/dateUtils';

const CATEGORIES = ['Food', 'Transportation', 'Entertainment', 'Utilities', 'Healthcare', 'Shopping', 'Other'];

const EMPTY_FORM = {
  title: '',
  category: 'Food',
  amount: '',
  date: getTodayInSydney(),
  description: ''
};

const ExpenseForm = ({ onSubmit, initialData = null, onCancel }) => {
  const [formData, setFormData] = useState(initialData || EMPTY_FORM);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  /**
   * When the user clicks "Edit" on a different expense while the form is
   * already open, initialData changes but the component does not unmount.
   * This effect keeps the form fields in sync with the selected expense.
   */
  useEffect(() => {
    if (initialData) {
      setFormData({
        title:       initialData.title       || '',
        category:    initialData.category    || 'Food',
        amount:      initialData.amount      || '',
        date:        initialData.date ? getDateInSydney(initialData.date) : getTodayInSydney(),
        description: initialData.description || ''
      });
    }
  }, [initialData]);

  /**
   * Generic change handler for all fields.
   * Amount gets an additional guard: only digits and a single decimal point
   * are accepted so the user cannot type letters or multiple dots.
   * The value is stored as a string to preserve formatting (e.g. "12.50").
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setError(''); // Clear any existing error as the user edits

    if (name === 'amount') {
      // Reject input that doesn't match a valid partial decimal number
      if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /** Runs before submit; returns true if all fields are valid */
  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required.');
      return false;
    }
    if (!formData.category) {
      setError('Category is required.');
      return false;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Amount must be a positive number.');
      return false;
    }
    if (!formData.date) {
      setError('Date is required.');
      return false;
    }
    // Block future dates by comparing YYYY-MM-DD strings directly.
    // String comparison works correctly here because the format is ISO-ordered.
    if (formData.date > getTodayInSydney()) {
      setError('Date cannot be in the future (Sydney time).');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Convert amount string to float only at submission time
      await onSubmit({ ...formData, amount: parseFloat(formData.amount) });

      // Only reset to empty form when creating — editing keeps the form visible
      // with the updated data until the parent hides it
      if (!initialData) {
        setFormData({ ...EMPTY_FORM, date: getTodayInSydney() });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="expense-form" onSubmit={handleSubmit} noValidate>
      <h2>{initialData ? 'Edit Expense' : 'Add New Expense'}</h2>

      {error && <div className="error-message" role="alert">{error}</div>}

      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g., Grocery Shopping"
          disabled={loading}
          maxLength={100}
        />
      </div>

      <div className="form-group">
        <label htmlFor="category">Category *</label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          disabled={loading}
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="amount">Amount ($) *</label>
        <input
          type="text"
          id="amount"
          name="amount"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
          inputMode="decimal"   /* Shows numeric keyboard on mobile */
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="date">Date *</label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          max={getMaxDateForInput()} /* Prevents selecting future dates via the picker */
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add notes about this expense..."
          rows="3"
          disabled={loading}
          maxLength={500}
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? 'Saving...' : initialData ? 'Update Expense' : 'Add Expense'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={loading} className="btn-cancel">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ExpenseForm;
