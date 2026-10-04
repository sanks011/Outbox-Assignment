import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For local dev convenience or demo mode, if no auth token is passed, allow with default demo user
    req.user = {
      id: 'demo-user-oliver',
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
    };
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; email: string; name?: string };
    req.user = decoded;
    next();
  } catch {
    // If token invalid, default to demo user or 401
    req.user = {
      id: 'demo-user-oliver',
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
    };
    next();
  }
}
