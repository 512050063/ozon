import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import logger from '../config/logger';
import prisma from '../config/database';
import { LoginSessionError, SESSION_KICKED, assertTokenSessionActive } from '../services/loginSessionService';

interface JwtPayload {
  id: number;
  username: string;
  role: string;
  sid?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '缺少访问令牌',
      });
    }

    // 验证token
    const decoded = verifyToken(token);

    // 检查用户是否存在且有效
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌',
      });
    }

    await assertTokenSessionActive(prisma, {
      userId: decoded.id,
      sessionId: decoded.sid,
    });

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error instanceof LoginSessionError && error.code === SESSION_KICKED) {
      return res.status(401).json({
        success: false,
        code: SESSION_KICKED,
        message: error.message,
      });
    }

    logger.error('Token验证失败:', error);
    return res.status(401).json({
      success: false,
      message: '无效的访问令牌',
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`用户 ${req.user.username} 尝试访问无权限的资源 (需要角色: ${roles.join(', ')}, 实际角色: ${req.user.role})`);
      return res.status(403).json({
        success: false,
        message: '您没有权限访问此资源',
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['super_admin']);

export const requireSeller = requireRole(['super_admin', 'admin', 'seller']);

const normalizePermissions = (permissions: unknown): string[] => {
  if (Array.isArray(permissions)) {
    return permissions.filter((item): item is string => typeof item === 'string');
  }

  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: '未授权访问',
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          username: true,
          status: true,
          role: {
            select: {
              permissions: true,
            },
          },
        },
      });

      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: '账号不可用',
        });
      }

      const permissions = normalizePermissions(user.role?.permissions);
      if (!permissions.includes(permission)) {
        logger.warn(`用户 ${user.username} 尝试访问无权限资源: ${permission}`);
        return res.status(403).json({
          success: false,
          message: '无权限访问该功能',
        });
      }

      next();
    } catch (error) {
      logger.error('权限校验失败:', error);
      res.status(500).json({
        success: false,
        message: '权限校验失败',
      });
    }
  };
};
