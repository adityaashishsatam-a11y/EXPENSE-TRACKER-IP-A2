/**
 * ExpenseItem Component
 *
 * Renders a single expense as a card showing all its fields.
 * Receives callbacks from the parent (ExpenseList → App) for edit and delete,
 * keeping this component purely presentational with no direct API calls.
 *
 * Design decisions:
 *  - The category CSS class is derived by lowercasing the category string
 *    (e.g. "Food" → "category-food") so new categories only need a CSS rule,
 *    not a JavaScript mapping.
 *  - window.confirm() provides a simple, accessible deletion guard without
 *    adding a custom modal component. The parent's onDelete is only called
 *    after the user explicitly confirms.
 *  - Date display uses formatDateSydney() to ensure dates always reflect
 *    Sydney local time regardless of the user's device timezone.
 *
 * Props:
 *   expense  — expense document from the API
 *   onEdit   — callback(expense) invoked when Edit is clicked
 *   onDelete — callback(id) invoked after the user confirms deletion
 */

import React from 'react';
import '../styles/ExpenseItem.css';
import { formatDateSydney } from '../services/dateUtils';

const ExpenseItem = ({ expense, onEdit, onDelete }) => {
  // Format the stored UTC date for display in Sydney timezone
  const formattedDate = formatDateSydney(expense.date);

  const handleDelete = () => {
    // Ask for confirmation before triggering the irreversible delete
    if (window.confirm('Are you sure you want to delete this expense?')) {
      onDelete(expense._id);
    }
  };

  return (
    <div className="expense-item">
      <div className="expense-header">
        <div className="expense-title-category">
          <h3 className="expense-title">{expense.title}</h3>
          {/* Category badge colour is driven by CSS class derived from the value */}
          <span className={`category-badge category-${expense.category.toLowerCase()}`}>
            {expense.category}
          </span>
        </div>
        <div className="expense-amount" aria-label={`Amount: $${expense.amount.toFixed(2)}`}>
          ${expense.amount.toFixed(2)}
        </div>
      </div>

      <div className="expense-body">
        <div className="expense-date">
          <strong>Date:</strong> {formattedDate}
        </div>
        {/* Description is optional — only rendered when present */}
        {expense.description && (
          <div className="expense-description">
            <strong>Notes:</strong> {expense.description}
          </div>
        )}
      </div>

      <div className="expense-actions">
        <button className="btn-edit" onClick={() => onEdit(expense)}>
          Edit
        </button>
        <button className="btn-delete" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
};

export default ExpenseItem;
