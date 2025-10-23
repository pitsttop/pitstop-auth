import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';


interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

export const authorize = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    const [, token] = authHeader.split(' ');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, role: UserRole };

      
      if (!roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Acesso negado: permissão insuficiente.' }); // 403 Forbidden
      }

      
      req.user = decoded;

      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido.' });
    }
  };
};