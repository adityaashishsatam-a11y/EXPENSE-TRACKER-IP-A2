/* Author: Harshali Tambadkar (25543582) */
// Sydney, Australia timezone utilities

/**
 * Get today's date in Sydney timezone (AEST/AEDT)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getTodayInSydney = () => {
  const sydneyDate = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Australia/Sydney'
  });
  return sydneyDate;
};

/**
 * Get a date string in Sydney timezone
 * @param {Date|string} date - Date to convert
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getDateInSydney = (date) => {
  const d = new Date(date);
  const sydneyDate = d.toLocaleDateString('en-CA', {
    timeZone: 'Australia/Sydney'
  });
  return sydneyDate;
};

/**
 * Format date for display in Sydney timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date (e.g., "May 21, 2026")
 */
export const formatDateSydney = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date with time in Sydney timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date with time (e.g., "May 21, 2026, 2:30 PM")
 */
export const formatDateTimeInSydney = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Get max date allowed (today in Sydney) for date input
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getMaxDateForInput = () => {
  return getTodayInSydney();
};
