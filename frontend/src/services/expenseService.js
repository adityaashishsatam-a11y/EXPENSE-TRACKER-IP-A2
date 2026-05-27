/**
 * Expense Service
 *
 * Wraps all /api/expenses/* API calls and attaches the JWT automatically
 * via the Authorization header. All functions throw on error so callers
 * (components) can handle errors in their own try/catch blocks.
 *
 * Live search:
 *   getExpenses(search) appends a ?search= query param when a search string
 *   is provided. The server performs the regex match — this avoids downloading
 *   all expenses and filtering in the browser, which would be expensive at scale.
 */

import axios from 'axios';
import { getToken } from './authService';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Factory that returns an axios instance scoped to the expenses endpoint,
 * with the current user's JWT in the Authorization header.
 */
const api = () =>
  axios.create({
    baseURL: `${BASE_URL}/expenses`,
    headers: { Authorization: `Bearer ${getToken()}` }
  });

export const createExpense = async (data) => {
  const res = await api().post('/', data);
  return res.data;
};

/**
 * Fetches expenses, optionally filtered by a search string.
 * @param {string} search - If non-empty, sent as ?search= query param
 */
export const getExpenses = async (search = '') => {
  const params = search ? { search } : {};
  const res = await api().get('/', { params });
  return res.data;
};

export const getExpenseById = async (id) => {
  const res = await api().get(`/${id}`);
  return res.data;
};

export const updateExpense = async (id, data) => {
  const res = await api().put(`/${id}`, data);
  return res.data;
};

export const deleteExpense = async (id) => {
  const res = await api().delete(`/${id}`);
  return res.data;
};
