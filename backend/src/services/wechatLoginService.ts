import axios from 'axios';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import logger from '../config/logger';
import { createLoginSession } from './loginSessionService';

// 微信API配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';
const WECHAT_QRCODE_API = 'https://api.weixin.qq.com/cgi-bin/qrcode/create';
const WECHAT_ACCESS_TOKEN_API = 'https://api.weixin.qq.com/cgi-bin/token';
const WECHAT_USER_INFO_API = 'https://api.weixin.qq.com/cgi-bin/user/info';
const WECHAT_SHOWQRCODE_API = 'https://mp.weixin.qq.com/cgi-bin/showqrcode';

// 微信访问令牌缓存
let wechatAccessToken: string | null = null;
let accessTokenExpireTime: number = 0;

/**
 * 获取微信访问令牌
 */
async function getAccessToken(): Promise<string> {
  // 检查令牌是否还有效（提前5分钟刷新）
  if (wechatAccessToken && Date.now() < accessTokenExpireTime - 5 * 60 * 1000) {
    return wechatAccessToken;
  }

  try {
    const response = await axios.get(WECHAT_ACCESS_TOKEN_API, {
      params: {
        grant_type: 'client_credential',
        appid: WECHAT_APP_ID,
        secret: WECHAT_APP_SECRET,
      },
    });

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      throw new Error('获取微信访问令牌失败');
    }

    wechatAccessToken = access_token;
    accessTokenExpireTime = Date.now() + expires_in * 1000;

    logger.info('微信访问令牌获取成功');
    return access_token;
  } catch (error: any) {
    logger.error('获取微信访问令牌失败:', error.message);
    throw new Error('获取微信访问令牌失败');
  }
}

/**
 * 生成微信登录二维码
 */
export async function generateLoginQRCode(): Promise<{
  sceneStr: string;
  qrCodeUrl: string;
  expireAt: Date;
}> {
  try {
    const accessToken = await getAccessToken();

    // 生成唯一的场景值
    const sceneStr = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建临时二维码
    const response = await axios.post(WECHAT_QRCODE_API, {
      expire_seconds: 600, // 10分钟过期
      action_name: 'QR_STR_SCENE',
      action_info: {
        scene: {
          scene_str: sceneStr,
        },
      },
    }, {
      params: { access_token: accessToken },
    });

    const { ticket, expire_seconds } = response.data;

    if (!ticket) {
      throw new Error('生成微信二维码失败');
    }

    // 构建二维码图片URL
    const qrCodeUrl = `${WECHAT_SHOWQRCODE_API}?ticket=${encodeURIComponent(ticket)}`;

    // 计算过期时间
    const expireAt = new Date(Date.now() + expire_seconds * 1000);

    // 保存会话信息
    await prisma.wechatLoginSession.create({
      data: {
        sceneStr,
        ticket,
        expireAt,
        status: 'pending',
      },
    });

    logger.info(`微信登录二维码生成成功，场景值: ${sceneStr}`);

    return {
      sceneStr,
      qrCodeUrl,
      expireAt,
    };
  } catch (error: any) {
    logger.error('生成微信登录二维码失败:', error.message);
    throw new Error('生成微信登录二维码失败');
  }
}

/**
 * 查询微信登录状态
 */
export async function checkLoginStatus(sceneStr: string): Promise<{
  status: string;
  token?: string;
  user?: any;
}> {
  try {
    const session = await prisma.wechatLoginSession.findUnique({
      where: { sceneStr },
    });

    if (!session) {
      return { status: 'invalid' };
    }

    // 检查会话是否过期
    if (session.expireAt < new Date()) {
      await prisma.wechatLoginSession.update({
        where: { sceneStr },
        data: { status: 'expired' },
      });
      return { status: 'expired' };
    }

    // 如果会话已确认登录
    if (session.status === 'confirmed' && session.userId) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { role: true },
      });

      if (user) {
        const loginSession = await createLoginSession(prisma, {
          userId: user.id,
          force: true,
          deviceId: `wechat-${sceneStr}`,
          ipAddress: null,
          userAgent: null,
        });

        // 生成JWT token
        const token = generateToken({
          id: user.id,
          username: user.username,
          role: user.role.code,
          sid: loginSession.sessionId,
        });

        return {
          status: 'confirmed',
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            status: user.status,
          },
        };
      }
    }

    return { status: session.status };
  } catch (error: any) {
    logger.error('查询微信登录状态失败:', error.message);
    throw new Error('查询微信登录状态失败');
  }
}

/**
 * 处理微信扫码后的回调
 */
export async function handleWechatCallback(sceneStr: string, openid: string, unionid?: string): Promise<void> {
  try {
    const session = await prisma.wechatLoginSession.findUnique({
      where: { sceneStr },
    });

    if (!session) {
      throw new Error('会话不存在');
    }

    // 更新会话状态为已扫码
    await prisma.wechatLoginSession.update({
      where: { sceneStr },
      data: {
        status: 'scanned',
        openid,
        unionid,
      },
    });

    // 检查是否已存在绑定该微信的用户
    let user = await prisma.user.findFirst({
      where: { OR: [{ wechatOpenid: openid }, { wechatUnionid: unionid }] },
    });

    if (user) {
      // 用户已存在，更新会话状态为已确认
      await prisma.wechatLoginSession.update({
        where: { sceneStr },
        data: {
          status: 'confirmed',
          userId: user.id,
        },
      });
    } else {
      // 用户不存在，创建新用户
      const username = `wechat_${openid.slice(-8)}`;

      // 获取微信用户信息
      const userInfo = await getWechatUserInfo(openid);

      user = await prisma.user.create({
        data: {
          username,
          password: '', // 微信登录用户无密码
          roleId: 4, // 普通用户
          status: 'active',
          wechatOpenid: openid,
          wechatUnionid: unionid,
          wechatNickname: userInfo.nickname,
          wechatAvatar: userInfo.headimgurl,
        },
        include: { role: true },
      });

      await prisma.wechatLoginSession.update({
        where: { sceneStr },
        data: {
          status: 'confirmed',
          userId: user.id,
        },
      });

      logger.info(`微信用户创建成功: ${username}`);
    }

    logger.info(`微信登录成功，用户: ${user?.username}`);
  } catch (error: any) {
    logger.error('处理微信登录回调失败:', error.message);
    throw new Error('处理微信登录回调失败');
  }
}

/**
 * 获取微信用户信息
 */
async function getWechatUserInfo(openid: string): Promise<any> {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.get(WECHAT_USER_INFO_API, {
      params: {
        access_token: accessToken,
        openid,
        lang: 'zh_CN',
      },
    });

    const { nickName, headImgUrl } = response.data;
    return {
      nickname: nickName,
      headimgurl: headImgUrl,
    };
  } catch (error: any) {
    logger.error('获取微信用户信息失败:', error.message);
    return {
      nickname: '',
      headimgurl: '',
    };
  }
}

/**
 * 清理过期的微信登录会话
 */
export async function cleanExpiredSessions(): Promise<void> {
  try {
    const expiredSessions = await prisma.wechatLoginSession.findMany({
      where: {
        OR: [
          { expireAt: { lt: new Date() } },
          { status: 'expired' },
        ],
      },
    });

    if (expiredSessions.length > 0) {
      await prisma.wechatLoginSession.deleteMany({
        where: {
          OR: [
            { expireAt: { lt: new Date() } },
            { status: 'expired' },
          ],
        },
      });

      logger.info(`清理了 ${expiredSessions.length} 个过期的微信登录会话`);
    }
  } catch (error: any) {
    logger.error('清理过期微信登录会话失败:', error.message);
  }
}
