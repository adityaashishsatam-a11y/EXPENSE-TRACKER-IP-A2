/* Author: Harshali Tambadkar (25543582) */
/**
 * SpendingSummary Component
 * Author: Aditya Ashish Satam (25402847)
 *
 * A compact spending dashboard widget rendered above the expense list.
 * Shows the user an at-a-glance overview for the current month:
 *   1. Total spent this month (with month-over-month % change vs last month)
 *   2. Category breakdown — horizontal bars proportional to total spending
 *   3. Budget status badges — how many categories are over / near / within budget
 *
 * Design decisions:
 *   - useMemo is used for every derived value (category totals, % change,
 *     etc.) because SpendingSummary re-renders whenever the parent passes
 *     a new `expenses` array (e.g. after search or CRUD).  Memoising prevents
 *     recomputing the full aggregation on every unrelated render.
 *   - Month-over-month comparison is approximated from the expense list
 *     (the parent already has the data) rather than making an extra API call.
 *     This is a deliberate UX trade-off: slight inaccuracy vs. extra latency.
 *   - Category bars use percentage widths relative to the highest-spending
 *     category so the chart always fills the available space visually.
 *
 * Props:
 *   expenses — array of all user expense objects for the current filter state
 *   budgets  — array of budget objects (with actualSpent) from the API
 */

import React, { useMemo } from 'react';
import '../styles/SpendingSummary.css';

const CATEGORY_EMOJIS = {
  Food:           '🍔',
  Transportation: '🚗',
  Entertainment:  '🎬',
  Utilities:      '💡',
  Healthcare:     '💊',
  Shopping:       '🛍️',
  Other:          '📦'
};

const CATEGORY_COLORS = {
  Food:           '#f6ad55',
  Transportation: '#63b3ed',
  Entertainment:  '#fc8181',
  Utilities:      '#68d391',
  Healthcare:     '#b794f4',
  Shopping:       '#f687b3',
  Other:          '#a0aec0'
};

const SpendingSummary = ({ expenses, budgets = [] }) => {
  const now = new Date();
  const thisMonth  = now.getMonth();
  const thisYear   = now.getFullYear();
  const lastMonth  = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastYear   = thisMonth === 0 ? thisYear - 1 : thisYear;

  /**
   * Total spent across all visible expenses in the current month.
   * Rounded to 2dp to avoid floating-point display issues.
   */
  const totalThisMonth = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, thisMonth, thisYear]);

  /** Previous month total for comparison */
  const totalLastMonth = useMemo(() => {
    return expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, lastMonth, lastYear]);

  /** Month-over-month change expressed as a percentage */
  const pctChange = useMemo(() => {
    if (totalLastMonth === 0) return null; // can't divide by zero
    return ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;
  }, [totalThisMonth, totalLastMonth]);

  /**
   * Aggregate this month's spending per category, sorted by amount descending.
   * Filters to current month only so the category bars reflect the same period
   * as the monthly total above.
   */
  const categoryTotals = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      const d = new Date(e.date);
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return;
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, thisMonth, thisYear]);

  // If there's no spending data for this month, hide the widget
  if (categoryTotals.length === 0) return null;

  const maxCategoryTotal = categoryTotals[0]?.total || 1;

  // Budget summary: how many categories are over budget?
  const overBudgetCount  = budgets.filter(b => b.actualSpent > b.monthlyLimit).length;
  const nearBudgetCount  = budgets.filter(b => {
    const pct = b.actualSpent / b.monthlyLimit;
    return pct >= 0.8 && pct < 1;
  }).length;

  const monthLabel = new Date(thisYear, thisMonth, 1)
    .toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  return (
    <div className="spending-summary">
      {/* ── Title row ── */}
      <div className="summary-header">
        <h3 className="summary-title">📅 {monthLabel} Overview</h3>
        {/* Budget status badges */}
        {budgets.length > 0 && (
          <div className="budget-badges">
            {overBudgetCount > 0 && (
              <span className="badge-over">{overBudgetCount} over budget</span>
            )}
            {nearBudgetCount > 0 && (
              <span className="badge-near">{nearBudgetCount} near limit</span>
            )}
            {overBudgetCount === 0 && nearBudgetCount === 0 && (
              <span className="badge-ok">All within budget ✓</span>
            )}
          </div>
        )}
      </div>

      {/* ── Total + change indicator ── */}
      <div className="summary-total-row">
        <div className="summary-total">
          <span className="summary-total-label">Total Spent</span>
          <span className="summary-total-amount">${totalThisMonth.toFixed(2)}</span>
        </div>
        {pctChange !== null && (
          <div className={`summary-change ${pctChange > 0 ? 'change-up' : 'change-down'}`}>
            {pctChange > 0 ? '▲' : '▼'}
            {' '}{Math.abs(pctChange).toFixed(0)}% vs last month
          </div>
        )}
      </div>

      {/* ── Category breakdown bars ── */}
      <div className="category-breakdown">
        {categoryTotals.map(({ category, total }) => {
          const barWidth   = (total / maxCategoryTotal) * 100;
          const budget     = budgets.find(b => b.category === category);
          const isOver     = budget && total > budget.monthlyLimit;
          const isNear     = budget && !isOver && (total / budget.monthlyLimit) >= 0.8;
          const budgetPct  = budget ? Math.round((total / budget.monthlyLimit) * 100) : null;

          return (
            <div key={category} className="breakdown-row">
              <span className="breakdown-label">
                {CATEGORY_EMOJIS[category] || '•'} {category}
              </span>
              <div className="breakdown-bar-wrap">
                <div
                  className={`breakdown-bar ${isOver ? 'bar-over' : isNear ? 'bar-near' : ''}`}
                  style={{
                    width:      `${barWidth}%`,
                    background: isOver ? '#e53e3e' : isNear ? '#dd6b20' : CATEGORY_COLORS[category] || '#a0aec0'
                  }}
                />
              </div>
              <span className="breakdown-amount">${total.toFixed(2)}</span>
              {budgetPct !== null && (
                <span className={`breakdown-budget-pct ${isOver ? 'pct-over' : isNear ? 'pct-near' : 'pct-ok'}`}>
                  {budgetPct}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpendingSummary;
