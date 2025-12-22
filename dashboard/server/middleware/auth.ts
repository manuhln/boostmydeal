import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../modules/user/User';
import { Organization, IOrganization } from '../modules/organization/Organization';

export interface AuthRequest extends Request {
  user?: IUser;
  organization?: IOrganization;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    console.log('Auth middleware - Header:', authHeader, 'Token:', !!token, 'Token value:', token);
    
    if (!token || token === 'null' || token === 'undefined') {
      console.log('Auth middleware - No valid token provided');
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log('Auth middleware - Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      console.log('Auth middleware - User not found or inactive');
      return res.status(401).json({ message: 'Invalid token or user deactivated.' });
    }

    const organization = await Organization.findById(user.organizationId);
    
    if (!organization || !organization.isActive) {
      console.log('Auth middleware - Organization not found or inactive');
      return res.status(401).json({ message: 'Organization not found or deactivated.' });
    }

    console.log('Auth middleware - Success:', user.email, organization.name);
    
    req.user = user;
    req.organization = organization;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!req.user.permissions.includes(permission) && 
        !['owner', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }

    next();
  };
};

export const generateToken = (userId: string): string => {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  console.log('Token generated for userId:', userId, 'Token length:', token.length);
  return token;
};