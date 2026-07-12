import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import logger from './config/logger';
import * as wechatLoginService from './services/wechatLoginService';
import { getUploadRoot } from './services/publicAssetUrlService';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const BACKEND_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(BACKEND_ROOT, '..');
const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const corsOrigin =
  configuredCorsOrigins.length > 0
    ? configuredCorsOrigins
    : process.env.NODE_ENV === 'development'
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'https://58.87.104.60']
      : false;

// 定期清理过期的微信登录会话（每30分钟执行一次）
setInterval(() => {
  wechatLoginService.cleanExpiredSessions().catch(error => {
    logger.error('清理过期微信登录会话失败:', error);
  });
}, 30 * 60 * 1000); // 30分钟

// 首次启动时立即清理一次 - 添加安全保护
setTimeout(() => {
  wechatLoginService.cleanExpiredSessions().catch(error => {
    logger.error('首次清理过期微信登录会话失败:', error);
  });
}, 3000);

// 配置CORS
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// 配置中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 文件上传由 multer 在各路由中单独配置

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers['user-agent'];

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]({
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      userAgent,
    });
  });

  next();
});

// 静态文件服务（用于访问上传的头像和商品素材）
app.use('/uploads', express.static(getUploadRoot()));

// 素材库本地上传图片静态服务
app.use('/images', express.static(path.join(WORKSPACE_ROOT, 'frontend', 'public', 'images')));

// 商品图片静态文件服务（用于访问本地存储的商品图片）
app.use('/assets/images/product-images', express.static(path.join(WORKSPACE_ROOT, 'frontend', 'src', 'assets', 'images', 'product-images')));

// 导入路由
import authRoutes from './routes/authRoutes';
import pricingRoutes from './routes/pricingRoutes';
import userManagementRoutes from './routes/userManagementRoutes';
import apiConfigRoutes from './routes/apiConfigRoutes';
import roleManagementRoutes from './routes/roleManagementRoutes';
import membershipRoutes from './routes/membershipRoutes';
import paymentRecordRoutes from './routes/paymentRecordRoutes';
import ozonStoreRoutes from './routes/ozonStoreRoutes';
import ozonPushRoutes from './routes/ozonPushRoutes';
import ozonCategoryRoutes from './routes/ozonCategoryRoutes';
import imageRoutes from './routes/imageRoutes';
import productSelectionRoutes from './routes/productSelectionRoutes';
import alibabaRoutes from './routes/alibabaRoutes';
import ozonCrawlerRoutes from './routes/ozonCrawlerRoutes';
import ozonCookieRoutes from './routes/ozonCookieRoutes';
import ozonSearchRoutes from './routes/ozonSearchRoutes';
import ozonMessageRoutes from './routes/ozonMessageRoutes';
import ozonOrderRoutes from './routes/ozonOrderRoutes';
import ozonFinanceRoutes from './routes/ozonFinanceRoutes';
import ozonPromotionRoutes from './routes/ozonPromotionRoutes';
import ozonTypeRoutes from './routes/ozonTypeRoutes';
import ozonPreferenceRoutes from './routes/ozonPreferenceRoutes';
import autoReplyRoutes from './routes/autoReplyRoutes';
import productSupplyRoutes from './routes/productSupplyRoutes';
import supplySourceRoutes from './routes/supplySourceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import translationRoutes from './routes/translationRoutes';
import installRoutes from './routes/installRoutes';
import ozonBrowserTaskRoutes from './routes/ozonBrowserTaskRoutes';
import workerRoutes from './routes/workerRoutes';
import { authenticateToken } from './middleware/authMiddleware';

// 安装向导路由必须在全局认证前注册；安装完成后由安装锁阻止写操作。
app.use('/api/install', installRoutes);

// 全局认证中间件 - 除了 auth 和 health 路由外，所有请求都需要登录
app.use('/api', (req, res, next) => {
  // 排除不需要认证的路由
  if (req.path.startsWith('/auth') || req.path === '/health' || req.path.startsWith('/install') || req.path.startsWith('/ozon/push') || req.path.startsWith('/worker')) {
    return next();
  }
  // 1688 callback 换取 Token 接口：跨域无法携带 JWT，通过 state 参数识别用户，无需全局认证
  if (req.path === '/alibaba/auth/token' && req.method === 'GET') {
    return next();
  }
  // Ozon 远程图片代理用于 <img> 标签展示，浏览器不会附带 Authorization 头；代理内部只允许 Ozon 图片域名
  if (req.path === '/images/proxy' && req.method === 'GET') {
    return next();
  }
  // 其他所有路由都需要认证
  return authenticateToken(req, res, next);
});

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/users', userManagementRoutes);
app.use('/api/api-configs', apiConfigRoutes);
app.use('/api/roles', roleManagementRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/payment-records', paymentRecordRoutes);
app.use('/api/ozon/stores', ozonStoreRoutes);
app.use('/api/ozon/push', ozonPushRoutes);
app.use('/api/ozon/categories', ozonCategoryRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/product-selection', productSelectionRoutes);
app.use('/api/alibaba', alibabaRoutes);
app.use('/api/ozon/crawler', ozonCrawlerRoutes);
app.use('/api/ozon/cookie', ozonCookieRoutes);
app.use('/api/ozon/search', ozonSearchRoutes);
app.use('/api/ozon/messages', ozonMessageRoutes);
app.use('/api/ozon/orders', ozonOrderRoutes);
app.use('/api/ozon/finance', ozonFinanceRoutes);
app.use('/api/ozon/promotions', ozonPromotionRoutes);
app.use('/api/ozon/type', ozonTypeRoutes);
app.use('/api/ozon/preference', ozonPreferenceRoutes);
app.use('/api/ozon/browser', ozonBrowserTaskRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/auto-reply', autoReplyRoutes);
app.use('/api/product-supply', productSupplyRoutes);
app.use('/api/supply-sources', supplySourceRoutes);
app.use('/api/translations', translationRoutes);

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
  });
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export { app, logger };
