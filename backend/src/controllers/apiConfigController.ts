import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

// 获取所有 API 配置
export const getApiConfigs = async (req: Request, res: Response) => {
  try {
    const records = await prisma.apiConfig.findMany({
      orderBy: [
        { platform: 'asc' },
        { updatedAt: 'desc' },
      ],
    });
    const configs = Array.from(
      records.reduce((map, cfg) => {
        if (!map.has(cfg.platform)) {
          map.set(cfg.platform, cfg);
        }
        return map;
      }, new Map<string, (typeof records)[number]>()),
      ([, cfg]) => cfg,
    );

    // 对1688配置：过滤掉可能残留的token字段，合并 user_tokens 表的授权状态
    const enrichedConfigs = await Promise.all(configs.map(async (cfg) => {
      if (cfg.platform === '1688') {
        const configData = cfg.config as any;
        // 移除旧 config 中可能残留的 token 字段
        const { accessToken, access_token, tokenExpiresIn, expires_in,
                tokenObtainedAt, obtained_at, tokenType, token_type,
                ...safeConfig } = configData || {};

        // 从 user_tokens 表获取授权状态
        const tokenRecord = await prisma.userToken.findFirst({
          where: { platform: '1688' },
          orderBy: { updatedAt: 'desc' }
        });

        const hasToken = !!tokenRecord;
        const isExpired = tokenRecord ? new Date() > tokenRecord.expiresAt : true;
        const remainingSeconds = tokenRecord && !isExpired
          ? Math.max(0, Math.floor((tokenRecord.expiresAt.getTime() - Date.now()) / 1000))
          : 0;

        return {
          ...cfg,
          config: {
            ...safeConfig,
            // 前端需要的授权状态信息（不含 accessToken 明文）
            authStatus: {
              hasToken,
              isExpired,
              remainingSeconds,
              obtainedAt: tokenRecord?.obtainedAt?.toISOString() || null,
              expiresAt: tokenRecord?.expiresAt?.toISOString() || null,
            }
          }
        };
      }
      return cfg;
    }));

    res.json({
      success: true,
      message: '获取API配置成功',
      data: enrichedConfigs,
    });
  } catch (error: any) {
    logger.error('获取API配置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 获取单个 API 配置
export const getApiConfig = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    const config = await prisma.apiConfig.findFirst({
      where: {
        platform,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'API配置不存在',
      });
    }

    res.json({
      success: true,
      message: '获取API配置成功',
      data: config,
    });
  } catch (error: any) {
    logger.error('获取API配置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 更新或创建 API 配置
export const updateApiConfig = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const userId = (req as any).user.id;
    let { config, status = 'valid' } = req.body;

    // 对1688配置：过滤掉前端可能传回的token字段（token现在存在user_tokens表）
    if (platform === '1688') {
      const { accessToken, access_token, tokenExpiresIn, expires_in,
              tokenObtainedAt, obtained_at, tokenType, token_type,
              authStatus, ...safeConfig } = config as any;
      config = safeConfig;
    }

    const existingConfig = await prisma.apiConfig.findFirst({
      where: {
        platform,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingConfig) {
      // 更新现有配置
      const updatedConfig = await prisma.apiConfig.update({
        where: { id: existingConfig.id },
        data: {
          config,
          status,
        },
      });

      res.json({
        success: true,
        message: '更新API配置成功',
        data: updatedConfig,
      });
    } else {
      // 创建新配置
      const newConfig = await prisma.apiConfig.create({
        data: {
          userId,
          platform,
          config,
          status,
        },
      });

      res.status(201).json({
        success: true,
        message: '创建API配置成功',
        data: newConfig,
      });
    }
  } catch (error: any) {
    logger.error('更新API配置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 删除 API 配置
export const deleteApiConfig = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    const config = await prisma.apiConfig.findFirst({
      where: {
        platform,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'API配置不存在',
      });
    }

    await prisma.apiConfig.delete({
      where: { id: config.id },
    });

    res.json({
      success: true,
      message: '删除API配置成功',
    });
  } catch (error: any) {
    logger.error('删除API配置失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};

// 测试 API 连接
export const testApiConnection = async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    const config = await prisma.apiConfig.findFirst({
      where: {
        platform,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'API配置不存在',
      });
    }

    let success = false;
    let message = '连接测试成功';

    if (platform === 'sms') {
      const { endpoint, accessKeyId, accessKeySecret, signName } = config.config as any;
      if (endpoint && accessKeyId && accessKeySecret && signName) {
        success = true;
        message = '短信认证服务配置完整';
      } else {
        success = false;
        message = '请填写API 地址、AccessKey ID、AccessKey Secret和短信认证签名';
      }
    } else if (platform === 'translation') {
      // 中俄翻译连接测试 - 腾讯云翻译API
      const { url, secretId, secretKey } = config.config as any;
      if (url && secretId && secretKey) {
        try {
          const axios = require('axios');
          const crypto = require('crypto');

          const region = 'ap-guangzhou';
          const service = 'tmt';
          const version = '2018-03-21';
          const action = 'TextTranslate';
          const timestamp = Math.floor(Date.now() / 1000);
          const date = new Date(timestamp * 1000).toISOString().substring(0, 10);

          // 构造请求参数
          const payload = {
            SourceText: 'hello',
            Source: 'auto',
            Target: 'zh',
            ProjectId: 0
          };

          const payloadStr = JSON.stringify(payload);

          // 步骤1: 拼接规范请求字符串
          const algorithm = 'TC3-HMAC-SHA256';
          const httpRequestMethod = 'POST';
          const canonicalUri = '/';
          const canonicalQueryString = '';
          const canonicalHeaders = `content-type:application/json\nhost:${service}.tencentcloudapi.com\nx-tc-action:${action.toLowerCase()}\n`;
          const signedHeaders = 'content-type;host;x-tc-action';
          const hashedRequestPayload = crypto.createHash('sha256').update(payloadStr).digest('hex');
          const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

          // 步骤2: 拼接字符串签名
          const credentialScope = `${date}/${service}/tc3_request`;
          const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
          const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

          // 步骤3: 计算签名
          const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
          const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
          const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
          const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

          // 步骤4: 拼接Authorization
          const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

          // 发送请求
          const response = await axios.post(`https://${service}.tencentcloudapi.com/`, payload, {
            headers: {
              'Authorization': authorization,
              'Content-Type': 'application/json',
              'Host': `${service}.tencentcloudapi.com`,
              'X-TC-Action': action,
              'X-TC-Timestamp': timestamp.toString(),
              'X-TC-Version': version,
              'X-TC-Region': region
            }
          });

          success = response.status === 200 && response.data.Response && !response.data.Response.Error;
          if (success) {
            message = '连接测试成功';
          } else {
            message = response.data.Response.Error?.Message || 'API连接失败';
          }
        } catch (error) {
          logger.error('腾讯云翻译API连接测试失败:', error);
          success = false;
          message = 'API连接失败';
        }
      } else {
        success = false;
        message = '请填写完整的API配置';
      }
    } else {
      // 其他平台默认成功
      success = true;
    }

    res.json({
      success,
      message,
    });
  } catch (error: any) {
    logger.error('测试API连接失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误',
    });
  }
};
