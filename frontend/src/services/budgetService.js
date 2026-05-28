/**
 * Budget Service
 * Author: Aditya Ashish Satam (25402847)
 *
 * Wraps all /api/budgets/* HTTP calls.
 * Uses authAxios() (from authService) so the JWT Authorization header is
 * injected automatically — no need to pass tokens at the call site.
 */

import { authAxios } from './authService';

// ── Budget CRUD ───────────────────────────────────────────────────────────────

/**
 * Fetches all budgets for the authenticated user in a given month.
 * Returns budgets enriched with `actualSpent` from the server.
 *
 * @param {number} month — 1–12 (default: current month)
 * @param {number} year  — 4-digit year (default: current year)
 */
export const getBudgets = async (month, year) => {
  const params = {};
  if (month) params.month = month;
  if (year)  params.year  = year;
  const res = await authAxios().get('/budgets', { params });
  return res.data;
};

/**
 * Creates a budget (or updates the limit if one already exists for the same
 * category+month — the backend uses upsert).
 *
 * @param {Object} budgetData — { category, monthlyLimit, month?, year? }
 */
export const createBudget = async (budgetData) => {
  const res = await authAxios().post('/budgets', budgetData);
  return res.data;
};

/**
 * Updates the monthly limit of an existing budget.
 *
 * @param {string} id          — Budget document ID
 * @param {number} monthlyLimit — New limit value
 */
export const updateBudget = async (id, monthlyLimit) => {
  const res = await authAxios().put(`/budgets/${id}`, { monthlyLimit });
  return res.data;
};

/**
 * Permanently deletes a budget.
 *
 * @param {string} id — Budget document ID
 */
export const deleteBudget = async (id) => {
  const res = await authAxios().delete(`/budgets/${id}`);
  return res.data;
};
