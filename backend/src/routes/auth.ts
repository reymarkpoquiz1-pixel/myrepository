import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { db } from '../config/database';
import { authMiddleware, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const loginValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name required'),
  body('lastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name required'),
  body('position').trim().isLength({ min: 1, max: 100 }).withMessage('Position required'),
  body('role').isIn(['staff', 'public']).withMessage('Invalid role')
];

const changePasswordValidation = [
  body('currentPassword').isLength({ min: 6 }).withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];

// Helper function to generate JWT tokens
const generateTokens = (user: any) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });

  return { accessToken, refreshToken };
};

// POST /api/auth/login
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  // Find user by username or email
  const user = await db('users')
    .where('username', username)
    .orWhere('email', username)
    .first();

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    return res.status(401).json({ error: 'Account is not active' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Update last login
  await db('users')
    .where('id', user.id)
    .update({ last_login: new Date() });

  // Generate tokens
  const tokens = generateTokens(user);

  // Return user info and tokens
  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      position: user.position,
      department: user.department
    },
    tokens
  });
}));

// POST /api/auth/register (public registration)
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    username,
    email,
    password,
    firstName,
    lastName,
    middleName,
    position,
    department,
    role
  } = req.body;

  // Check if username or email already exists
  const existingUser = await db('users')
    .where('username', username)
    .orWhere('email', email)
    .first();

  if (existingUser) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const [userId] = await db('users').insert({
    username,
    email,
    password_hash: passwordHash,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
    position,
    department,
    role,
    status: 'active',
    is_verified: false
  }).returning('id');

  // Get created user
  const newUser = await db('users')
    .where('id', userId)
    .first();

  // Generate tokens
  const tokens = generateTokens(newUser);

  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      position: newUser.position,
      department: newUser.department
    },
    tokens
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!;
    const decoded = jwt.verify(refreshToken, secret) as any;

    // Get user from database
    const user = await db('users')
      .where('id', decoded.id)
      .first();

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      message: 'Token refreshed successfully',
      tokens
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

// POST /api/auth/logout
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  // In a more sophisticated system, you might want to blacklist the token
  // For now, we'll just return success
  res.json({ message: 'Logout successful' });
}));

// GET /api/auth/me
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await db('users')
    .select('id', 'username', 'email', 'role', 'first_name', 'last_name', 'middle_name', 'position', 'department', 'avatar_url', 'is_verified', 'last_login')
    .where('id', req.user!.id)
    .first();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      position: user.position,
      department: user.department,
      avatarUrl: user.avatar_url,
      isVerified: user.is_verified,
      lastLogin: user.last_login
    }
  });
}));

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, changePasswordValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  // Get current user with password
  const user = await db('users')
    .where('id', req.user!.id)
    .first();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await db('users')
    .where('id', req.user!.id)
    .update({
      password_hash: newPasswordHash,
      updated_at: new Date()
    });

  res.json({ message: 'Password changed successfully' });
}));

// POST /api/auth/verify-email (admin only)
router.post('/verify-email/:userId', authMiddleware, requireRole(['admin', 'secretary']), asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await db('users')
    .where('id', userId)
    .first();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await db('users')
    .where('id', userId)
    .update({
      is_verified: true,
      updated_at: new Date()
    });

  res.json({ message: 'User email verified successfully' });
}));

export default router;