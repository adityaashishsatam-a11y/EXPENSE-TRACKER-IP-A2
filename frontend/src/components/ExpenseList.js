/* Author: Harshali Tambadkar (25543582) */
/**
 * ExpenseList Component
 *
 * Displays the authenticated user's expenses with three layers of interaction:
 *   1. Live Search   — passed in via onSearch prop; triggers server-side filtering
 *   2. Category Filter — client-side filter applied to the server's response
 *   3. Monthly Trend — collapsible bar chart grouped by month (client-side)
 *
 * Filter interaction design:
 *   Search and category filter work together: when a new search fires, the
 *   category filter resets to "All". This prevents a confusing state where
 *   a user searches for "coffee", applies a category filter, then changes
 *   the search — the old category filter would silently hide results.
 *   Resetting on search gives predictable, consistent behaviour.
 *
 * Performance:
 *   - useMemo is used for categories, filteredExpenses, total, and monthlyTrend
 *     to avoid recomputing derived values on every render (e.g. a keystroke
 *     in a different part of the UI). Each memo only recalculates when its
 *     specific dependency (expenses or filterCategory) actually changes.
 *
 * Props:
 *   expenses  — array of expense objects from the API
 *   onEdit    — callback(expense) to open the edit form
 *   onDelete  — callback(id) to delete an expense
 *   loading   — boolean; shows spinner while the API call is in flight
 *   onSearch  — callback(query) wired to the SearchBar; triggers API re-fetch
 */

import React, { useState, useMemo, useCallback } from 'react';
import ExpenseItem from './ExpenseItem';
import SearchBar from './SearchBar';
import '../styles/ExpenseList.css';

const ExpenseList = ({ expenses, onEdit, onDelete, loading, onSearch }) => {
  const [filterCategory, setFilterCategory] = useState('All');
  const [showMonthlyTrend, setShowMonthlyTrend] = useState(false);

  /**
   * Wraps onSearch so we can reset the category filter to "All" each time
   * a new search is submitted. Prevents stale category filter from hiding
   * results after the expense list changes due to a new search query.
   * useCallback keeps this reference stable so SearchBar doesn't re-render.
   */
  const handleSearch = useCallback((query) => {
    setFilterCategory('All');
    onSearch(query);
  }, [onSearch]);

  /** Derive the unique set of categories present in the current expense list */
  const categories = useMemo(() => {
    return ['All', ...new Set(expenses.map(exp => exp.category))];
  }, [expenses]);

  /** Apply category filter client-side on top of whatever the server returned */
  const filteredExpenses = useMemo(() => {
    if (filterCategory === 'All') return expenses;
    return expenses.filter(exp => exp.category === filterCategory);
  }, [expenses, filterCategory]);

  /** Running total of the filtered (visible) expenses */
  const total = useMemo(
    () => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    [filteredExpenses]
  );

  /**
   * Group all expenses (not just filtered) by year-month in Sydney timezone,
   * sorted newest-first. Used to draw the monthly expenditure bar chart.
   * Operates on the full `expenses` array so the chart always shows the
   * complete picture regardless of the active category filter.
   */
  const monthlyTrend = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      // Use 'en-CA' locale to get YYYY-MM-DD format reliably across browsers
      const sydneyDate = d.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
      const [year, month] = sydneyDate.split('-');
      const key   = `${year}-${month}`;
      const label = d.toLocaleDateString('en-AU', {
        timeZone: 'Australia/Sydney', year: 'numeric', month: 'long'
      });
      if (!map[key]) map[key] = { label, total: 0, count: 0 };
      map[key].total += exp.amount;
      map[key].count += 1;
    });
    // Sort descending by key (ISO year-month string comparison is correct)
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, v]) => v);
  }, [expenses]);

  if (loading) {
    return (
      <div className="expense-list-loading" aria-live="polite">
        <div className="spinner" role="status" aria-label="Loading expenses" />
        <p>Loading your expenses…</p>
      </div>
    );
  }

  return (
    <div className="expense-list-container">

      {/* Live search bar — only rendered when parent provides onSearch */}
      {onSearch && (
        <div className="search-section">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search by title, category, or description…"
          />
        </div>
      )}

      <div className="expense-list-header">
        <div className="filter-section">
          <label htmlFor="category-filter">Filter by Category:</label>
          <select
            id="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="category-filter"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="total-section" aria-live="polite">
          <span className="total-label">Total ({filteredExpenses.length}):</span>
          <span className="total-amount">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Monthly trend chart — only shown when there is data to display */}
      {expenses.length > 0 && (
        <div className="monthly-trend-section">
          <button
            className="monthly-trend-toggle"
            onClick={() => setShowMonthlyTrend(p => !p)}
            aria-expanded={showMonthlyTrend}
          >
            📈 Monthly Expenditure Trend {showMonthlyTrend ? '▲' : '▼'}
          </button>

          {showMonthlyTrend && (
            <div className="monthly-trend-grid">
              {monthlyTrend.map((m, i) => {
                // Bar width is proportional to the highest-spending month
                const max      = monthlyTrend[0].total;
                const barWidth = max > 0 ? (m.total / max) * 100 : 0;
                return (
                  <div key={i} className="trend-row">
                    <span className="trend-month">{m.label}</span>
                    <div className="trend-bar-wrap" aria-hidden="true">
                      <div className="trend-bar" style={{ width: `${barWidth}%` }} />
                    </div>
                    <span className="trend-total">${m.total.toFixed(2)}</span>
                    <span className="trend-count">({m.count} item{m.count !== 1 ? 's' : ''})</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Expense cards */}
      <div className="expense-list">
        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <p>
              {expenses.length === 0
                ? 'No expenses yet. Add your first one!'
                : 'No expenses match your current filters.'}
            </p>
          </div>
        ) : (
          filteredExpenses.map(expense => (
            <ExpenseItem
              key={expense._id}
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
