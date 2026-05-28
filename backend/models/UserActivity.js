/* Author: Aditya Ashish Satam (25402847) */
/**
 * UserActivity Model — Third Entity (Assignment 2 Requirement)
 *
 * Logs every significant action a user takes in the system.
 * Used by the admin panel to audit login history, expense CRUD events,
 * and account registrations across all users.
 *
 * Design decision: kept as a separate collection (not embedded in User)
 * because activity logs are append-only, can grow large, and are only
 * queried by admins — separating them avoids bloating the User document.
 *
 * Fields:
 *   user      - Reference to the User who performed the action
 *   action    - Enum of supported event types
 *   detail    - Human-readable summary (e.g. "Created expense: Coffee ($4.50)")
 *   ipAddress - Captured from req.ip for audit trail purposes
 */

const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: ['login', 'logout', 'register', 'create_expense', 'update_expense', 'delete_expense']
    },
    detail: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String
    }
  },
  { timestamps: true } // createdAt serves as the activity timestamp
);

module.exports = mongoose.model('UserActivity', userActivitySchema);
