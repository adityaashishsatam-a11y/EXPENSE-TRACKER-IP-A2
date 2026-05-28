/* Author: Harshali Tambadkar (25543582) */
/**
 * Modal Component
 * Author: Aditya Ashish Satam (25402847)
 *
 * A reusable confirmation / alert dialog that replaces browser's native
 * window.confirm().  Using a custom modal instead of window.confirm() provides:
 *   - Consistent styling that matches the rest of the UI
 *   - Non-blocking behaviour (window.confirm() halts the JS thread)
 *   - Better accessibility with focus management and keyboard support
 *   - Customisable button labels and danger/info styling variants
 *
 * Implementation notes:
 *   - ReactDOM.createPortal renders the overlay directly on document.body to
 *     avoid z-index conflicts with ancestor elements that have overflow:hidden
 *     or transform applied.
 *   - The Escape key triggers onCancel for keyboard users.
 *   - Clicking the backdrop (outside the card) also cancels.
 *   - useEffect adds/removes the keydown listener based on isOpen so there
 *     are no stale listeners when the modal is closed.
 *
 * Props:
 *   isOpen      — boolean; controls visibility
 *   title       — heading text
 *   message     — body text (supports newlines via white-space: pre-line CSS)
 *   onConfirm   — called when user clicks the confirm button
 *   onCancel    — called on cancel, backdrop click, or Escape key
 *   confirmText — confirm button label (default: "Confirm")
 *   cancelText  — cancel button label (default: "Cancel")
 *   variant     — 'danger' | 'info' (default: 'danger') — colours confirm btn
 */

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import '../styles/Modal.css';

const Modal = ({
  isOpen,
  title       = 'Confirm',
  message     = 'Are you sure?',
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  variant     = 'danger'
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onCancel} // Close on backdrop click
    >
      {/* Stop clicks inside the card from bubbling to the backdrop */}
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 id="modal-title" className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            className={`modal-btn modal-btn-${variant}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
          <button className="modal-btn modal-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
