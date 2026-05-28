/* Author: Harshali Tambadkar (25543582) */
/**
 * Toast Notification System
 * Author: Aditya Ashish Satam (25402847)
 *
 * Provides a lightweight, accessible toast notification stack rendered at the
 * top-right corner of the screen.  Designed as a React Context so any component
 * in the tree can call showToast() without prop drilling.
 *
 * Design decisions:
 *   - Context + useReducer instead of useState: the reducer keeps the
 *     "add toast / remove toast" transitions explicit and makes it easy to
 *     extend (e.g. add a "clear all" action) without refactoring callers.
 *   - Each toast gets a unique ID (Date.now + counter) so React keys are
 *     always stable even if two toasts arrive within the same millisecond.
 *   - Auto-dismiss timer is set inside the reducer dispatch effect in
 *     ToastProvider, not inside the reducer itself (reducers must be pure).
 *   - ReactDOM.createPortal renders the stack on document.body to avoid
 *     z-index issues with parent elements that have stacking contexts.
 *
 * Usage:
 *   1. Wrap the app (or a subtree) with <ToastProvider>
 *   2. In any component: const { showToast } = useToast();
 *   3. showToast('Expense added!', 'success');
 *      showToast('Failed to delete.', 'error');
 *      showToast('Changes saved.', 'info');
 */

import React, {
  createContext, useContext, useReducer, useCallback
} from 'react';
import ReactDOM from 'react-dom';
import '../styles/Toast.css';

// ── Context & Reducer ─────────────────────────────────────────────────────────

const ToastContext = createContext(null);

let _id = 0; // Simple incrementing counter to guarantee unique IDs

const toastReducer = (state, action) => {
  switch (action.type) {
    case 'ADD':
      return [...state, action.payload];
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
};

// ── Provider ──────────────────────────────────────────────────────────────────

export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  /**
   * Adds a toast and schedules its removal after `duration` ms.
   * useCallback keeps the reference stable so callers wrapped in
   * useCallback/useMemo don't re-run unnecessarily.
   *
   * @param {string} message  — text to display
   * @param {'success'|'error'|'info'} type — styling variant
   * @param {number} duration — auto-dismiss delay in ms (default 3500)
   */
  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++_id;
    dispatch({ type: 'ADD', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE', id }), duration);
  }, []);

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {ReactDOM.createPortal(
        <ToastStack toasts={toasts} onClose={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

/** Returns { showToast } from the nearest ToastProvider */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

// ── Toast Stack UI ────────────────────────────────────────────────────────────

const TYPE_ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ'
};

const ToastStack = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} role="status">
          <span className="toast-icon" aria-hidden="true">{TYPE_ICONS[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button
            className="toast-close"
            onClick={() => onClose(t.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
