import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

function getActorRoleLevel(roleCode?: string | null): number {
  if (roleCode === 'super_admin') return 3;
  if (roleCode === 'admin') return 2;
  return 1;
}

async function getActor(req: Request) {
  const currentUserId = req.user?.id;
  if (!currentUserId) return null;
  return prisma.user.findFirst({
    where: { id: currentUserId, deletedAt: null },
    include: { role: true },
  });
}

async function assertRoleManagePermission(req: Request, targetRole?: { code: string } | null) {
  const actor = await getActor(req);
  if (!actor) {
    return { allowed: false, status: 401, message: '未授权访问' };
  }

  const actorLevel = getActorRoleLevel(actor.role?.code);
  if (actorLevel === 3) return { allowed: true, actor };
  if (actorLevel === 2 && targetRole?.code !== 'super_admin') return { allowed: true, actor };
  return { allowed: false, status: 403, message: '当前账号无角色管理权限' };
}

// 获取所有角色（含用户数量）
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const [roles, activeUserCounts] = await Promise.all([
      prisma.role.findMany({
        orderBy: { id: 'asc' },
      }),
      prisma.user.groupBy({
        by: ['roleId'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    const userCountMap = new Map<number, number>();
    activeUserCounts.forEach(item => {
      userCountMap.set(item.roleId, item._count._all);
    });

    const rolesWithUserCount = roles.map(role => ({
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || []),
      isSystem: role.isSystem,
      userCount: userCountMap.get(role.id) || 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    res.json({
      success: true,
      message: '获取角色列表成功',
      data: rolesWithUserCount,
    });
  } catch (error: any) {
    logger.error('获取角色列表失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 获取单个角色
export const getRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    res.json({
      success: true,
      message: '获取角色信息成功',
      data: {
        ...role,
        permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || []),
      },
    });
  } catch (error: any) {
    logger.error('获取角色信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 创建角色
export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, code, description, permissions } = req.body;

    const permission = await assertRoleManagePermission(req, { code: code || '' });
    if (!permission.allowed) {
      return res.status(permission.status || 403).json({
        success: false,
        message: permission.message,
      });
    }

    // 验证必填字段
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: '角色名称和角色代码为必填项',
      });
    }

    // 检查角色名称是否已存在
    const existingRoleByName = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRoleByName) {
      return res.status(400).json({
        success: false,
        message: '角色名称已存在',
      });
    }

    // 检查角色代码是否已存在
    const existingRoleByCode = await prisma.role.findUnique({
      where: { code },
    });

    if (existingRoleByCode) {
      return res.status(400).json({
        success: false,
        message: '角色代码已存在',
      });
    }

    const role = await prisma.role.create({
      data: {
        name,
        code,
        description,
        permissions: permissions || [],
        isSystem: false,
      },
    });

    logger.info(`管理员创建角色成功: ${name}`);

    res.status(201).json({
      success: true,
      message: '创建角色成功',
      data: {
        ...role,
        permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || []),
      },
    });
  } catch (error: any) {
    logger.error('创建角色失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 更新角色
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, permissions } = req.body;

    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    const permission = await assertRoleManagePermission(req, existingRole);
    if (!permission.allowed) {
      return res.status(permission.status || 403).json({
        success: false,
        message: permission.message,
      });
    }

    // 如果要修改角色名称，检查是否与其他角色冲突
    if (name && name !== existingRole.name) {
      const roleWithName = await prisma.role.findUnique({
        where: { name },
      });

      if (roleWithName) {
        return res.status(400).json({
          success: false,
          message: '角色名称已存在',
        });
      }
    }

    // 如果要修改角色代码，检查是否与其他角色冲突
    if (code && code !== existingRole.code) {
      const roleWithCode = await prisma.role.findUnique({
        where: { code },
      });

      if (roleWithCode) {
        return res.status(400).json({
          success: false,
          message: '角色代码已存在',
        });
      }

      // 不允许修改系统角色的代码
      if (existingRole.isSystem) {
        return res.status(400).json({
          success: false,
          message: '系统角色的代码不能修改',
        });
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(code && !existingRole.isSystem && { code }),
        ...(description !== undefined && { description }),
        ...(permissions !== undefined && { permissions }),
      },
    });

    logger.info(`管理员更新角色成功: ${updatedRole.name}`);

    res.json({
      success: true,
      message: '更新角色成功',
      data: {
        ...updatedRole,
        permissions: typeof updatedRole.permissions === 'string' ? JSON.parse(updatedRole.permissions) : (updatedRole.permissions || []),
      },
    });
  } catch (error: any) {
    logger.error('更新角色失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 删除角色
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查角色是否存在
    const existingRole = await prisma.role.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: '角色不存在',
      });
    }

    const permission = await assertRoleManagePermission(req, existingRole);
    if (!permission.allowed) {
      return res.status(permission.status || 403).json({
        success: false,
        message: permission.message,
      });
    }

    // 检查是否有用户正在使用该角色
    const usersWithRole = await prisma.user.count({
      where: {
        roleId: parseInt(id),
        deletedAt: null,
      },
    });

    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: '该角色正在被使用，无法删除',
      });
    }

    await prisma.role.delete({
      where: { id: parseInt(id) },
    });

    logger.info(`管理员删除角色成功: ${existingRole.name}`);

    res.json({
      success: true,
      message: '删除角色成功',
    });
  } catch (error: any) {
    logger.error('删除角色失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
