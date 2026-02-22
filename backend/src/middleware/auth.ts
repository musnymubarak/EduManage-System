import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: UserRole;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      id: string;
      username: string;
      role: UserRole;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires one of these roles: ${roles.join(', ')}` 
      });
      return;
    }

    next();
  };
};

// Helper to check if user has any of the specified roles
export const hasRole = (userRole: UserRole, ...allowedRoles: UserRole[]): boolean => {
  return allowedRoles.includes(userRole);
};

// Super Admin has all permissions
export const isSuperAdmin = (req: AuthRequest): boolean => {
  return req.user?.role === 'SUPER_ADMIN';
};
