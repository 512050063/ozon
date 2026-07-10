import { app, logger } from './app';
import prisma from './config/database';
import fs from 'fs';
import path from 'path';
import categorySyncScheduler from './services/categorySyncScheduler';
import { getInstallLockStatus } from './install/installLock';

const PORT = parseInt(process.env.PORT || '3000');
const LOGS_DIR = path.join(__dirname, '../logs');

// 确保日志目录存在
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// 优雅关闭处理
const gracefulShutdown = async () => {
  logger.info('正在关闭服务器...');

  try {
    // 停止定时任务
    categorySyncScheduler.stop();
    await prisma.$disconnect();
    logger.info('数据库连接已关闭');

    process.exit(0);
  } catch (error) {
    logger.error('关闭服务器时出错:', error);
    process.exit(1);
  }
};

// 监听终止信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    await prisma.$connect();
    logger.info('数据库连接成功');

    listen();
  } catch (error) {
    const installStatus = getInstallLockStatus();
    if (!installStatus.installed) {
      logger.warn('数据库连接失败，但系统尚未安装，将仅启动安装接口:', error);
      listen();
      return;
    }

    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

function listen() {
  app.listen(PORT, () => {
    logger.info(`
🚀 服务器启动成功!
📍 运行地址: http://localhost:${PORT}
🌐 环境: ${process.env.NODE_ENV || 'development'}
📊 健康检查: http://localhost:${PORT}/api/health
      `);

    // 定时任务已禁用
    // categorySyncScheduler.start();
  });
}

startServer();
