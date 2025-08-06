const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  resetUserPassword,
  toggleUserStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createUserValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'councilor']).withMessage('Invalid role')
];

const resetPasswordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Routes
router.get('/', getUsers);
router.post('/', createUserValidation, createUser);
router.get('/stats', getUserStats);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.put('/:id/reset-password', resetPasswordValidation, resetUserPassword);
router.put('/:id/toggle-status', toggleUserStatus);

module.exports = router;