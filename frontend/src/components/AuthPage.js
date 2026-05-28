/* Author: Harshali Tambadkar (25543582) */
/**
 * AuthPage Component
 *
 * Renders a single page that switches between Login and Register forms.
 * Manages its own form state (name, email, password) and error display.
 *
 * Design decisions:
 *  - A single component handles both modes (login/register) to reduce
 *    duplication; the `mode` state toggles which fields and labels render
 *  - Validation runs client-side before the API call to give instant
 *    feedback without a network round-trip for obvious mistakes (e.g. empty fields)
 *  - Server errors (e.g. "email already exists") are surfaced from the
 *    API response and shown in the same error slot as client-side errors
 *  - On success, the parent App component is notified via onAuthSuccess
 *    and takes over session management (token stored in localStorage)
 */

import React, { useState } from 'react';
import { login, register } from '../services/authService';
import '../styles/AuthPage.css';

const AuthPage = ({ onAuthSuccess }) => {
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(''); // Clear error when user starts typing
  };

  /** Client-side validation before hitting the API */
  const validate = () => {
    if (mode === 'register' && !formData.name.trim()) {
      setError('Name is required.');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required.');
      return false;
    }
    if (!formData.password) {
      setError('Password is required.');
      return false;
    }
    if (mode === 'register' && formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const data = await login(formData.email, formData.password);
        onAuthSuccess(data.user);
      } else {
        const data = await register(formData.name, formData.email, formData.password);
        onAuthSuccess(data.user);
      }
    } catch (err) {
      // Show the server's error message if available, otherwise a fallback
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>💰 Expense Tracker</h1>
          <p>Track your spending with ease</p>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Login
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {/* Name field — register mode only */}
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name</label>
              <input
                type="text"
                id="auth-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                disabled={loading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email</label>
            <input
              type="email"
              id="auth-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              type="password"
              id="auth-password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
              disabled={loading}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button type="submit" className="btn-auth" disabled={loading}>
            {loading
              ? 'Please wait...'
              : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="link-btn"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Register here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
