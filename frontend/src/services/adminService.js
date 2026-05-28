/* Author: Harshali Tambadkar (25543582) */
/**
 * Admin Service
 *
 * Wraps all /api/admin/* endpoints. Every function requires an admin-role JWT
 * (enforced server-side); if a non-admin token is used, the server returns 403.
 *
 * All functions return the parsed response data and throw on HTTP errors,
 * so callers (AdminPanel) handle errors in their own catch blocks.
 */

import axios from 'axios';
import { getToken } from './authService';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/** Pre-configured axios instance for admin endpoints */
const api = () =>
  axios.create({
    baseURL: `${BASE_URL}/admin`,
    headers: { Authorization: `Bearer ${getToken()}` }
  });

// Dashboard overview figures
export const getStats = async () => (await api().get('/stats')).data;

// User management
export const getAllUsers      = async ()       => (await api().get('/users')).data;
export const getUserExpenses  = async (id)     => (await api().get(`/users/${id}/expenses`)).data;
export const updateUser       = async (id, data) => (await api().put(`/users/${id}`, data)).data;
export const deleteUser       = async (id)     => (await api().delete(`/users/${id}`)).data;

// Expense management (admin can edit/delete any user's expense)
export const adminUpdateExpense = async (id, data) => (await api().put(`/expenses/${id}`, data)).data;
export const adminDeleteExpense = async (id)        => (await api().delete(`/expenses/${id}`)).data;

// Activity log
export const getActivities = async () => (await api().get('/activities')).data;
