import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import logger from '../config/logger';

const USER_STATUSES = new Set(['pending', 'active', 'inactive']);
type UserStatus = 'pending' | 'active' | 'inactive';

function getNextUserStatus(status: string): UserStatus {
  if (status === 'pending') return 'active';
  if (status === 'active') return 'inactive';
  return 'active';
}

export function getUserPrivilegeLevel(user: { username: string; role?: { code: string } | null }): number {
  if (user.role?.code === 'super_admin') return 3;
  if (user.role?.code === 'admin') return 2;
  return 1;
}

function isSuperAdmin(user: { role?: { code: string } | null }): boolean {
  return getUserPrivilegeLevel({ username: '', role: user.role }) === 3;
}

function canManageUserRoles(user: { role?: { code: string } | null }): boolean {
  return getUserPrivilegeLevel({ username: '', role: user.role }) >= 2;
}

export function canOperateTargetUser(
  actor: { id: number; username: string; role?: { code: string } | null },
  target: { id: number; username: string; role?: { code: string } | null },
): { allowed: boolean; message?: string } {
  const actorLevel = getUserPrivilegeLevel(actor);
  if (actorLevel === 3) return { allowed: true };

  const targetLevel = getUserPrivilegeLevel(target);
  if (actorLevel > targetLevel) {
    return { allowed: true };
  }

  return { allowed: false, message: '低权限用户不能操作高权限用户' };
}

function buildApprovalUpdate(existingUser: { status: string; memberLevel: string; trialExpiration: Date | null }, nextStatus?: string) {
  const updateData: any = {};

  if (nextStatus === undefined) return updateData;
  if (!USER_STATUSES.has(nextStatus)) {
    throw new Error('用户状态无效');
  }

  updateData.status = nextStatus;

  if (
    existingUser.status === 'pending' &&
    nextStatus === 'active' &&
    existingUser.memberLevel === 'trial' &&
    !existingUser.trialExpiration
  ) {
    const trialExpiration = new Date();
    trialExpiration.setDate(trialExpiration.getDate() + 3);
    updateData.trialExpiration = trialExpiration;
  }

  return updateData;
}

// 获取所有用户
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      where: {
        deletedAt: null
      },
      include: {
        role: true,
      },
    });

    res.json({
      success: true,
      message: '获取用户列表成功',
      data: users,
    });
  } catch (error: any) {
    logger.error('获取用户列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 获取单个用户
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { id: parseInt(id) },
      include: {
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    res.json({
      success: true,
      message: '获取用户信息成功',
      data: user,
    });
  } catch (error: any) {
    logger.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 创建用户
export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      username,
      password,
      roleId,
      memberLevel = 'free',
      nickname,
      phone,
    } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码为必填项',
      });
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在',
      });
    }

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const actor = await prisma.user.findFirst({
      where: { id: currentUserId, deletedAt: null },
      include: { role: true },
    });

    if (!actor) {
      return res.status(401).json({
        success: false,
        message: '当前账号不存在',
      });
    }

    const defaultRole = await prisma.role.findFirst({
      where: { code: { in: ['seller', 'user'] } },
    });

    if (!defaultRole) {
      return res.status(500).json({
        success: false,
        message: '默认用户角色不存在',
      });
    }

    if (!canManageUserRoles(actor)) {
      return res.status(403).json({
        success: false,
        message: '当前账号无新增用户权限',
      });
    }

    const effectiveRoleId = roleId ?? defaultRole.id;

    // 检查角色是否存在
    const role = await prisma.role.findUnique({
      where: { id: effectiveRoleId },
    });

    if (!role) {
      return res.status(400).json({
        success: false,
        message: '角色不存在',
      });
    }

    if (role.code === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: '禁止新增超管用户',
      });
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        roleId: effectiveRoleId,
        status: 'active',
        memberLevel,
        nickname,
        phone,
      },
      include: {
        role: true,
      },
    });

    logger.info(`管理员创建用户成功: ${username}`);

    res.status(201).json({
      success: true,
      message: '创建用户成功',
      data: user,
    });
  } catch (error: any) {
    logger.error('创建用户失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 更新用户
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      username,
      password,
      roleId,
      memberLevel,
      nickname,
      avatar,
      phone,
    } = req.body;

    // 检查用户是否存在
    const existingUser = await prisma.user.findFirst({
      where: { id: parseInt(id) },
      include: { role: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    if (currentUserId !== existingUser.id) {
      const actor = await prisma.user.findFirst({
        where: { id: currentUserId, deletedAt: null },
        include: { role: true },
      });

      if (!actor) {
        return res.status(401).json({
          success: false,
          message: '当前账号不存在',
        });
      }

      const permission = canOperateTargetUser(actor, existingUser);
      if (!permission.allowed) {
        return res.status(403).json({
          success: false,
          message: permission.message || '低权限用户不能操作高权限用户',
        });
      }
    }

    // 如果要修改用户名，检查是否与其他用户冲突
    if (username && username !== existingUser.username) {
      const userWithUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (userWithUsername) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在',
        });
      }
    }

    if (roleId !== undefined && roleId !== existingUser.roleId) {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: '未授权访问',
        });
      }

      const actor = await prisma.user.findFirst({
        where: { id: currentUserId, deletedAt: null },
        include: { role: true },
      });

      if (!actor) {
        return res.status(401).json({
          success: false,
          message: '当前账号不存在',
        });
      }

      if (actor.id === existingUser.id) {
        return res.status(400).json({
          success: false,
          message: '不能修改自己的角色',
        });
      }

      if (getUserPrivilegeLevel(actor) === 2 && getUserPrivilegeLevel(existingUser) >= 2) {
        return res.status(403).json({
          success: false,
          message: '管理员不能修改其他管理员或超管的角色',
        });
      }

      if (!canManageUserRoles(actor)) {
        return res.status(403).json({
          success: false,
          message: '只有管理员或超管可以修改用户角色',
        });
      }

      const role = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        return res.status(400).json({
          success: false,
          message: '角色不存在',
        });
      }

      if (role.code === 'super_admin') {
        return res.status(403).json({
          success: false,
          message: '禁止将用户修改为超管',
        });
      }
    }

    // 准备更新数据
    let updateData: any = {};
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) {
      updateData.password = await hashPassword(password);
    }
    if (roleId !== undefined && roleId !== existingUser.roleId) updateData.roleId = roleId;
    if (memberLevel !== undefined) updateData.memberLevel = memberLevel;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (phone !== undefined) updateData.phone = phone;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        role: true,
      },
    });

    logger.info(`管理员更新用户成功: ${user.username}`);

    res.json({
      success: true,
      message: '更新用户成功',
      data: user,
    });
  } catch (error: any) {
    logger.error('更新用户失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.id;
    const { id } = req.params;
    const targetUserId = parseInt(id, 10);

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
      });
    }

    const [actor, target] = await Promise.all([
      prisma.user.findFirst({
        where: { id: currentUserId, deletedAt: null },
        include: { role: true },
      }),
      prisma.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
        include: { role: true },
      }),
    ]);

    if (!actor) {
      return res.status(401).json({
        success: false,
        message: '当前账号不存在',
      });
    }

    if (!target) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    const nextStatus = getNextUserStatus(target.status);
    if (actor.id === target.id) {
      return res.status(400).json({
        success: false,
        message: '不能禁用自己的账号或改变自己的状态',
      });
    }

    const permission = canOperateTargetUser(actor, target);
    if (!permission.allowed) {
      return res.status(403).json({
        success: false,
        message: permission.message || '低权限用户不能操作高权限用户',
      });
    }

    const updateData = buildApprovalUpdate(target, nextStatus);
    const user = await prisma.user.update({
      where: { id: target.id },
      data: updateData,
      include: { role: true },
    });

    logger.info(`管理员切换用户状态成功: ${user.username} -> ${nextStatus}`);

    res.json({
      success: true,
      message: '用户状态更新成功',
      data: user,
    });
  } catch (error: any) {
    logger.error('切换用户状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 删除用户（软删除）
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const { id } = req.params;

    // 不能删除自己
    if (parseInt(id) === currentUserId) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账号',
      });
    }

    const [actor, user] = await Promise.all([
      prisma.user.findFirst({
        where: { id: currentUserId, deletedAt: null },
        include: { role: true },
      }),
      prisma.user.findFirst({
        where: { id: parseInt(id), deletedAt: null },
        include: { role: true },
      }),
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    if (!actor) {
      return res.status(401).json({
        success: false,
        message: '当前账号不存在',
      });
    }

    const permission = canOperateTargetUser(actor, user);
    if (!permission.allowed) {
      return res.status(403).json({
        success: false,
        message: permission.message || '低权限用户不能操作高权限用户',
      });
    }

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        deletedAt: new Date()
      }
    });

    logger.info(`管理员删除用户成功: ${user.username}`);

    res.json({
      success: true,
      message: '删除用户成功',
    });
  } catch (error: any) {
    logger.error('删除用户失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
