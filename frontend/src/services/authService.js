/* Author: Harshali Tambadkar (25543582) */
/**
 * Auth Service
 *
 * Manages JWT storage and provides login/register/logout functions
 * that wrap the /api/auth/* endpoints.
 *
 * Storage strategy:
 *  - Token and user object are stored in localStorage so sessions
 *    survive page refreshes without requiring a server-side session store
 *  - On logout, both keys are removed to fully clear the session client-side
 *
 * authAxios() is exported for use by other services that need an axios instance
 * with the Authorization header pre-populated from the stored token.
 */

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Token / session helpers ───────────────────────────────────────────────

export const getToken = () => localStorage.getItem('token');

/** Returns the parsed user object or null if no session exists */
export const getUser = () => {
  const u = localStorage.getItem('user');
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null; // Guard against corrupted localStorage data
  }
};

const saveSession = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Returns a pre-configured axios instance with the Bearer token header set.
 * Called as a factory function (not a singleton) so each call picks up
 * the latest token — important if the token is refreshed mid-session.
 */
export const authAxios = () =>
  axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${getToken()}` }
  });

// ── Auth actions ──────────────────────────────────────────────────────────

export const register = async (name, email, password) => {
  const res = await axios.post(`${BASE_URL}/auth/register`, { name, email, password });
  saveSession(res.data.token, res.data.user);
  return res.data;
};

export const login = async (email, password) => {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  saveSession(res.data.token, res.data.user);
  return res.data;
};

/** Clears the local session; the JWT is stateless so no server call needed */
export const logout = () => {
  clearSession();
};
