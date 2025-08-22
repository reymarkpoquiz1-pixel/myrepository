import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  username: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

// Authentication middleware
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ error: 'JWT secret not configured' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Verify user still exists and is active
    const user = await db('users')
      .select('id', 'username', 'email', 'role', 'first_name', 'last_name', 'status')
      .where('id', decoded.id)
      .first();

    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
    } else {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication error' });
    }
  }
};

// Role-based access control middleware
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

// Specific role middlewares
export const requireAdmin = requireRole(['admin']);
export const requireSecretary = requireRole(['admin', 'secretary']);
export const requireCouncilMember = requireRole(['admin', 'secretary', 'council_member', 'vice_mayor']);
export const requireStaff = requireRole(['admin', 'secretary', 'council_member', 'vice_mayor', 'staff']);

// Optional authentication middleware (for public routes that can show user info if logged in)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
        
        const user = await db('users')
          .select('id', 'username', 'email', 'role', 'first_name', 'last_name', 'status')
          .where('id', decoded.id)
          .first();

        if (user && user.status === 'active') {
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};