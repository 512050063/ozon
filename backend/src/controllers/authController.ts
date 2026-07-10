import { Request, Response } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, verifyToken } from '../utils/jwt';
import logger from '../config/logger';
import * as wechatLoginService from '../services/wechatLoginService';
import { addAvatarToHistory, removeAvatarHistoryEntry } from '../services/avatarService';
import { attachAvatarHistory, getUserAvatarState, updateUserAvatarState } from '../services/avatarPersistenceService';
import { SmsVerificationError, SmsVerificationScene, smsVerificationClient } from '../services/smsVerificationService';
import {
  ACTIVE_SESSION_EXISTS,
  LoginSessionError,
  createLoginSession,
  getSessionStatus,
  logoutLoginSession,
} from '../services/loginSessionService';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import jwt from 'jsonwebtoken';

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, '..');
const IMAGE_UPLOAD_DIR = path.join(WORKSPACE_ROOT, 'frontend', 'public', 'images');
const FORGOT_PASSWORD_RESET_PURPOSE = 'forgot_password_reset';
const SMS_SEND_COOLDOWN_MS = 60 * 1000;
const smsSendCooldowns = new Map<string, number>();
const phonePattern = /^1[3-9]\d{9}$/;
const codePattern = /^\d{6}$/;

function resolveSmsScene(scene: unknown): SmsVerificationScene {
  if (scene === 'forgot_password' || scene === 'bind_phone' || scene === 'unbind_phone' || scene === 'register') {
    return scene;
  }
  return 'bind_phone';
}

function sendSmsError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof SmsVerificationError) {
    const status = error.code === 'NOT_CONFIGURED' ? 503 : 400;
    return res.status(status).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
}

function readOptionalAuthUserId(req: Request) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;

  try {
    return verifyToken(token).id;
  } catch (error) {
    return null;
  }
}

function getSmsCooldownKey(scene: SmsVerificationScene, phone: string, owner: string | number) {
  return `${scene}:${owner}:${phone}`;
}

function getSmsCooldownRemainingSeconds(key: string) {
  const expireAt = smsSendCooldowns.get(key);
  if (!expireAt) return 0;

  const remainingMs = expireAt - Date.now();
  if (remainingMs <= 0) {
    smsSendCooldowns.delete(key);
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
}

function markSmsCooldown(key: string) {
  smsSendCooldowns.set(key, Date.now() + SMS_SEND_COOLDOWN_MS);
}

function createForgotPasswordResetToken(userId: number, phone: string) {
  return jwt.sign(
    {
      purpose: FORGOT_PASSWORD_RESET_PURPOSE,
      userId,
      phone,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '10m' }
  );
}

function verifyForgotPasswordResetToken(resetToken: string) {
  const payload = jwt.verify(resetToken, process.env.JWT_SECRET!) as {
    purpose?: string;
    userId?: number;
    phone?: string;
  };
  if (payload.purpose !== FORGOT_PASSWORD_RESET_PURPOSE || !payload.userId || !payload.phone) {
    throw new Error('invalid reset token');
  }
  return payload as { purpose: string; userId: number; phone: string };
}

// 发送验证码
export const sendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { phone, scene, username } = req.body;
    const smsScene = resolveSmsScene(scene);
    let cooldownOwner: string | number = phone || 'anonymous';

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号不能为空',
      });
    }

    if (!phonePattern.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确',
      });
    }

    if (smsScene === 'forgot_password') {
      if (!username) {
        return res.status(400).json({
          success: false,
          message: '请输入用户名',
        });
      }

      const user = await prisma.user.findFirst({
        where: {
          username,
          phone,
        },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户名或手机号错误',
        });
      }
      cooldownOwner = user.id;
    } else if (smsScene === 'bind_phone' || smsScene === 'unbind_phone') {
      const userId = readOptionalAuthUserId(req);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '请先登录后再发送验证码',
        });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true, status: true },
      });

      if (!currentUser || currentUser.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: '登录状态无效，请重新登录',
        });
      }

      cooldownOwner = currentUser.id;

      if (smsScene === 'bind_phone') {
        if (currentUser.phone === phone) {
          return res.status(400).json({
            success: false,
            message: '该手机号已绑定当前账号',
          });
        }
      }

      if (smsScene === 'unbind_phone' && currentUser.phone !== phone) {
        return res.status(400).json({
          success: false,
          message: '手机号与当前账号绑定手机号不一致',
        });
      }
    }

    const cooldownKey = getSmsCooldownKey(smsScene, phone, cooldownOwner);
    const remainingSeconds = getSmsCooldownRemainingSeconds(cooldownKey);
    if (remainingSeconds > 0) {
      return res.status(429).json({
        success: false,
        message: `验证码已发送，请 ${remainingSeconds} 秒后再试`,
        code: 'SMS_COOLDOWN',
        data: {
          remainingSeconds,
        },
      });
    }

    await smsVerificationClient.sendCode({ phone, scene: smsScene });
    markSmsCooldown(cooldownKey);
    logger.info(`短信验证码发送成功: scene=${smsScene}, phone=${phone}`);

    res.json({
      success: true,
      message: '验证码已发送，5分钟内有效',
      data: {
        cooldownSeconds: SMS_SEND_COOLDOWN_MS / 1000,
      },
    });
  } catch (error: any) {
    logger.error('发送验证码失败:', error);
    return sendSmsError(res, error, '发送验证码失败');
  }
};

// 验证验证码
export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { phone, code, scene } = req.body;
    const smsScene = resolveSmsScene(scene);

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        message: '手机号和验证码不能为空',
      });
    }

    if (!phonePattern.test(phone)) {
      return res.status(400).json({
        success: false,
        message: '手机号格式不正确',
      });
    }

    if (!codePattern.test(code)) {
      return res.status(400).json({
        success: false,
        message: '验证码格式不正确，必须是6位数字',
      });
    }

    await smsVerificationClient.checkCode({ phone, code, scene: smsScene });

    res.json({
      success: true,
      message: '验证码验证成功',
    });
  } catch (error: any) {
    logger.error('验证验证码失败:', error);
    return sendSmsError(res, error, '验证验证码失败');
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码为必填项',
      });
    }

    // 验证用户名格式：只能包含英文和数字，长度限制 4-20
    const usernamePattern = /^[a-zA-Z0-9]{4,20}$/;
    if (!usernamePattern.test(username)) {
      return res.status(400).json({
        success: false,
        message: '用户名只能包含英文和数字，长度为4-20位',
      });
    }

    // 检查用户名是否已存在。待审核、禁用、正常账号都不允许重复注册。
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在',
      });
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 生成默认昵称：用户 + 用户名前4位
    const defaultNickname = `用户${username.slice(0, 4)}`;

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        nickname: defaultNickname,
        roleId: 4, // 普通用户
        status: 'pending',
        memberLevel: 'trial', // 审核通过后开始试用期
        trialExpiration: null,
      },
      include: {
        role: true,
      },
    });

    logger.info(`新用户注册申请已提交: ${username}`);

    res.status(201).json({
      success: true,
      message: '注册申请已提交，等待管理员审核',
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    logger.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password, force, deviceId } = req.body;

    // 查找用户：支持用户名或手机号
    let user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
      },
    });

    // 如果通过用户名没有找到用户，尝试通过手机号查找
    if (!user) {
      user = await prisma.user.findFirst({
        where: { phone: username },
        include: {
          role: true,
        },
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: '账号待审核，请联系管理员',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用',
      });
    }

    // 验证密码
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误',
      });
    }

    const loginSession = await createLoginSession(prisma, {
      userId: user.id,
      force: Boolean(force),
      deviceId: typeof deviceId === 'string' ? deviceId : null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    // 生成JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role.code,
      sid: loginSession.sessionId,
    });

    logger.info(`用户登录成功: ${user.username}`);

    // 检查试用是否过期
    if (user.memberLevel === 'trial' && user.trialExpiration && new Date() > user.trialExpiration) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          memberLevel: 'free',
          trialExpiration: null,
        },
        include: {
          role: true,
        },
      });
      logger.info(`用户 ${user.username} 试用期已过，已自动降级到免费版`);
    }

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: await attachAvatarHistory(prisma, {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          memberLevel: user.memberLevel,
          trialExpiration: user.trialExpiration,
        }),
      },
    });
  } catch (error: any) {
    if (error instanceof LoginSessionError && error.code === ACTIVE_SESSION_EXISTS) {
      return res.status(409).json({
        success: false,
        code: ACTIVE_SESSION_EXISTS,
        message: error.message,
        data: {
          activeSession: error.activeSession,
        },
      });
    }

    logger.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

export const checkSessionStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await getSessionStatus(prisma, {
      userId: user.id,
      sessionId: user.sid,
    });

    res.json({
      success: true,
      message: '登录会话状态正常',
      data: result,
    });
  } catch (error) {
    logger.error('查询登录会话状态失败:', error);
    res.status(500).json({
      success: false,
      message: '查询登录会话状态失败',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await logoutLoginSession(prisma, {
      userId: user.id,
      sessionId: user.sid,
    });

    res.json({
      success: true,
      message: '退出登录成功',
    });
  } catch (error) {
    logger.error('退出登录失败:', error);
    res.status(500).json({
      success: false,
      message: '退出登录失败',
    });
  }
};

export const verifyForgotPasswordCode = async (req: Request, res: Response) => {
  try {
    const { username, phone, verificationCode }: {
      username: string;
      phone: string;
      verificationCode: string;
    } = req.body;

    if (!username || !phone || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: '用户名、手机号和验证码为必填项',
      });
    }

    // 验证验证码格式（6位数字）
    const codePattern = /^\d{6}$/;
    if (!codePattern.test(verificationCode)) {
      return res.status(400).json({
        success: false,
        message: '验证码格式不正确，必须是6位数字',
      });
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        username,
        phone,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户名或手机号错误',
      });
    }

    await smsVerificationClient.checkCode({ phone, code: verificationCode, scene: 'forgot_password' });

    res.json({
      success: true,
      message: '身份验证成功',
      data: {
        resetToken: createForgotPasswordResetToken(user.id, phone),
      },
    });
  } catch (error) {
    logger.error('忘记密码身份验证失败:', error);
    return sendSmsError(res, error, '服务器错误');
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword }: {
      resetToken: string;
      newPassword: string;
    } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '重置凭证和新密码为必填项',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码至少需要6位字符',
      });
    }

    let resetPayload: { userId: number; phone: string };
    try {
      resetPayload = verifyForgotPasswordResetToken(resetToken);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '重置凭证无效或已过期，请重新验证',
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: resetPayload.userId,
        phone: resetPayload.phone,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '账号或手机号绑定状态已变化，请重新验证',
      });
    }

    // 加密新密码
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    logger.info(`用户密码已重置: ${user.username}`);

    res.json({
      success: true,
      message: '密码重置成功！请使用新密码登录',
    });
  } catch (error) {
    logger.error('密码重置失败:', error);
    return sendSmsError(res, error, '服务器错误');
  }
};

// 修改密码（通过原密码验证）
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '原密码和新密码为必填项',
      });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 验证原密码
    const isPasswordValid = await comparePassword(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: '原密码错误',
      });
    }

    // 加密新密码
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    logger.info(`用户密码已修改: ${user.username}`);

    res.json({
      success: true,
      message: '密码修改成功！',
    });
  } catch (error) {
    logger.error('密码修改失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    let user = await prisma.user.findUnique({
      where: { id: userId },
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

    // 检查试用是否过期
    if (user.memberLevel === 'trial' && user.trialExpiration && new Date() > user.trialExpiration) {
      // 试用过期，降级到免费版
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          memberLevel: 'free',
          trialExpiration: null,
        },
        include: {
          role: true,
        },
      });
      logger.info(`用户 ${user.username} 试用期已过，已自动降级到免费版`);
    }

    res.json({
      success: true,
      data: await attachAvatarHistory(prisma, user),
    });
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 微信登录相关接口

export const getWechatLoginQRCode = async (req: Request, res: Response) => {
  try {
    const result = await wechatLoginService.generateLoginQRCode();
    res.json({
      success: true,
      message: '微信登录二维码生成成功',
      data: result,
    });
  } catch (error: any) {
    logger.error('生成微信登录二维码失败:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const checkWechatLoginStatus = async (req: Request, res: Response) => {
  try {
    const { sceneStr } = req.query;
    if (!sceneStr || typeof sceneStr !== 'string') {
      return res.status(400).json({
        success: false,
        message: '场景值不能为空',
      });
    }

    const result = await wechatLoginService.checkLoginStatus(sceneStr);
    res.json({
      success: true,
      message: '查询微信登录状态成功',
      data: result,
    });
  } catch (error: any) {
    logger.error('查询微信登录状态失败:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// 模拟微信扫码后的回调（实际项目中需要配置微信服务器回调）
export const simulateWechatCallback = async (req: Request, res: Response) => {
  try {
    const { sceneStr, openid, unionid } = req.body;
    if (!sceneStr || !openid) {
      return res.status(400).json({
        success: false,
        message: '场景值和openid不能为空',
      });
    }

    await wechatLoginService.handleWechatCallback(sceneStr, openid, unionid);
    res.json({
      success: true,
      message: '微信登录回调处理成功',
    });
  } catch (error: any) {
    logger.error('处理微信登录回调失败:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Multer 配置 - 头像上传
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = IMAGE_UPLOAD_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user.id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + userId + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG, JPG, PNG, GIF, WEBP 格式的图片'));
    }
  },
});

export const uploadAvatar = [
  avatarUpload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的头像',
        });
      }

      const userId = (req as any).user.id;
      const avatarUrl = '/images/' + req.file.filename;
      let originalFilename = req.file.originalname;
      try {
        if (originalFilename && !/^[\x00-\x7F]*$/.test(originalFilename)) {
          originalFilename = Buffer.from(originalFilename, 'latin1').toString('utf8');
        }
      } catch (error) {
        logger.warn('头像文件名编码处理失败，使用原始文件名', error);
      }

      const imageRecord = await prisma.image.create({
        data: {
          userId,
          bizType: 'avatar',
          fileName: originalFilename,
          fileUrl: avatarUrl,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
        },
      });

      const currentUserState = await getUserAvatarState(prisma, userId);
      const avatarHistory = addAvatarToHistory(currentUserState?.avatarHistory, avatarUrl);

      await updateUserAvatarState(prisma, userId, {
        avatar: avatarUrl,
        avatarHistory,
      });

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          avatar: avatarUrl,
        },
        include: {
          role: true,
        },
      });

      logger.info(`用户头像上传成功: ${user.username}`);

      res.json({
        success: true,
        message: '头像上传成功',
        data: {
          avatar: avatarUrl,
          avatarHistory,
          image: imageRecord,
          user: {
            ...user,
            avatarHistory,
          },
        },
      });
    } catch (error: any) {
      logger.error('头像上传失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '服务器错误',
      });
    }
  },
];

// 更新用户资料
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { username, nickname, phone, avatar, code, unbind } = req.body;

    const updateData: any = {};
    const currentUserState = await getUserAvatarState(prisma, userId);

    if (username !== undefined) {
      const userWithUsername = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
      });

      if (userWithUsername) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在',
        });
      }

      updateData.username = username;
    }
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    // 处理手机绑定/解绑
    if (phone !== undefined) {
      if (unbind) {
        if (!code) {
          return res.status(400).json({
            success: false,
            message: '请输入验证码',
          });
        }

        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { phone: true },
        });
        if (!currentUser?.phone || currentUser.phone !== phone) {
          return res.status(400).json({
            success: false,
            message: '只能解绑当前账号已绑定的手机号',
          });
        }

        await smsVerificationClient.checkCode({ phone, code, scene: 'unbind_phone' });

        // 解绑手机
        updateData.phone = null;
        logger.info(`用户解绑手机成功: ${userId}`);
      } else {
        // 绑定手机
        if (!code) {
          return res.status(400).json({
            success: false,
            message: '请输入验证码',
          });
        }

        await smsVerificationClient.checkCode({ phone, code, scene: 'bind_phone' });

        // 绑定手机（不更新用户名）
        updateData.phone = phone;
        logger.info(`用户绑定手机成功: ${userId} -> ${phone}`);
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true,
      },
    });

    const avatarHistory = avatar !== undefined
      ? addAvatarToHistory(currentUserState?.avatarHistory, avatar)
      : currentUserState?.avatarHistory ?? [];

    if (avatar !== undefined) {
      await updateUserAvatarState(prisma, userId, {
        avatar: avatar ?? null,
        avatarHistory,
      });
    }

    res.json({
      success: true,
      message: unbind ? '手机解绑成功' : '资料更新成功',
      data: {
        ...user,
        avatarHistory,
      },
    });
  } catch (error: any) {
    logger.error('更新资料失败:', error);
    return sendSmsError(res, error, '服务器错误');
  }
};

export const deleteAvatarHistoryItem = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar : '';
    const currentUserState = await getUserAvatarState(prisma, userId);

    if (!currentUserState) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    const nextState = removeAvatarHistoryEntry(currentUserState.avatar, currentUserState.avatarHistory, avatar);
    await updateUserAvatarState(prisma, userId, nextState);

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      message: '历史头像删除成功',
      data: {
        ...user,
        avatar: nextState.avatar,
        avatarHistory: nextState.avatarHistory,
      },
    });
  } catch (error: any) {
    logger.error('删除历史头像失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 微信解绑
export const unbindWechat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        wechatOpenid: null,
        wechatUnionid: null,
        wechatNickname: null,
        wechatAvatar: null,
      },
      select: {
        id: true,
        username: true,
        wechatOpenid: true,
        wechatNickname: true,
      },
    });

    logger.info(`用户解绑微信成功: ${user.username}`);

    res.json({
      success: true,
      message: '微信解绑成功',
      data: user,
    });
  } catch (error: any) {
    logger.error('解绑微信失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
