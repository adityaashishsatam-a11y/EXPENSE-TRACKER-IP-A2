/* Author: Harshali Tambadkar (25543582) */
/**
 * ExpenseItem Component
 * Author: Aditya Ashish Satam (25402847)
 *
 * Renders a single expense as a card with all its fields.
 * Receives edit and delete callbacks from the parent (ExpenseList → App),
 * keeping this component purely presentational with no direct API calls.
 *
 * Design decisions:
 *  - Category CSS class is derived by lowercasing the string
 *    (e.g. "Food" → "category-food") so adding a new category only requires
 *    a CSS rule, not a JS mapping — open/closed principle in practice.
 *  - Custom Modal replaces window.confirm() for the delete confirmation.
 *    Reasons: consistent styling with the rest of the UI, non-blocking
 *    (window.confirm() halts the JS event loop), better accessibility, and
 *    avoids browser-security restrictions that can suppress native dialogs.
 *  - useState for the modal open/close state — useReducer would be overkill
 *    for a single boolean toggle.
 *  - Date display uses formatDateSydney() to ensure dates always reflect
 *    Sydney local time regardless of the user's device timezone.
 *
 * Props:
 *   expense  — expense document from the API
 *   onEdit   — callback(expense) invoked when Edit is clicked
 *   onDelete — callback(id) invoked after the user confirms deletion
 */

import React, { useState } from 'react';
import Modal from './Modal';
import '../styles/ExpenseItem.css';
import { formatDateSydney } from '../services/dateUtils';

const ExpenseItem = ({ expense, onEdit, onDelete }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formattedDate = formatDateSydney(expense.date);

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDelete(expense._id);
  };

  return (
    <>
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
          <button className="btn-delete" onClick={() => setShowDeleteModal(true)}>
            Delete
          </button>
        </div>
      </div>

      {/* Custom modal replaces window.confirm() for better UX */}
      <Modal
        isOpen={showDeleteModal}
        title="Delete Expense"
        message={`Delete "${expense.title}" ($${expense.amount.toFixed(2)})?\nThis action cannot be undone.`}
        confirmText="Delete"
        cancelText="Keep"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
};

export default ExpenseItem;
