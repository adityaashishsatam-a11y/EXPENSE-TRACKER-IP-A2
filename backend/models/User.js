/**
 * User Model
 * Represents a registered user of the Expense Tracker application.
 * Handles password hashing automatically via a pre-save Mongoose hook,
 * so plain-text passwords are never stored in the database.
 *
 * Fields:
 *   name     - Display name shown in the UI
 *   email    - Unique login identifier (stored lowercase)
 *   password - bcrypt-hashed; excluded from query results by default (select: false)
 *   role     - 'user' (default) or 'admin'; controls access to the admin panel
 *   isActive - Admins can deactivate accounts without deleting data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Never returned in queries unless explicitly requested
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

/**
 * Pre-save hook: hash the password with bcrypt before persisting.
 * Only runs when the password field has been modified to avoid
 * re-hashing an already-hashed value on unrelated document updates.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10); // Cost factor of 10 balances security and speed
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Instance method: compare a candidate plain-text password against
 * the stored hash. Used during login to verify credentials.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
