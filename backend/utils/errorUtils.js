/* Author: Aditya Ashish Satam (25402847) */
/**
 * errorUtils.js — Shared Error Handling Utilities
 *
 * Centralises common error-response patterns so controllers stay concise
 * and error formatting is consistent across the entire API.
 *
 * Using a shared utility instead of duplicating the same if/else block in
 * every controller prevents inconsistencies and makes future changes
 * (e.g. adding logging or a different error format) a one-line edit.
 */

/**
 * Sends the appropriate HTTP error response for a caught controller error.
 * Handles two specific Mongoose error types with meaningful messages;
 * everything else is treated as an unexpected 500.
 *
 * @param {Object} res      — Express response object
 * @param {Error}  error    — The caught error
 * @param {string} fallback — Human-readable message for unexpected 500 errors
 */
const handleError = (res, error, fallback = 'An unexpected error occurred. Please try again.') => {
  // Mongoose validation failure (required field missing, enum mismatch, etc.)
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(e => e.message).join(', ');
    return res.status(400).json({ error: messages });
  }

  // Mongoose duplicate key violation (e.g. registering with an existing email)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists.` });
  }

  // Log unexpected errors server-side for debugging without leaking internals
  console.error('Controller error:', error.message);
  return res.status(500).json({ error: fallback });
};

module.exports = { handleError };
