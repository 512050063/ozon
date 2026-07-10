import cron from 'node-cron';
import { syncOzonCategoriesForAllStores } from './ozonCategoryService';
import logger from '../config/logger';

// 定时同步任务管理器
class CategorySyncScheduler {
  private job: any | null = null;

  /**
   * 启动定时同步任务
   * 默认每天凌晨 2 点同步一次
   */
  start(): void {
    // 0 2 * * * 表示每天凌晨 2 点执行
    // 也可以使用其他时间：
    // 0 0 * * * 每天0点
    // 0 */6 * * * 每6小时
    // */30 * * * * 每30分钟
    const schedule = '0 2 * * *';

    try {
      this.job = cron.schedule(schedule, async () => {
        logger.info('开始定时同步 Ozon 分类数据...');
        try {
          const result = await syncOzonCategoriesForAllStores('ZH_HANS');
          logger.info(`定时同步完成: 总分类数 ${result.totalCount}, 同步数量 ${result.syncedCount}, 店铺数 ${result.storeCount}, 失败店铺数 ${result.failedStores.length}`);
        } catch (error: any) {
          logger.error('定时同步分类数据失败:', error.message);
        }
      });

      logger.info(`定时分类同步任务已启动，计划时间: ${schedule}`);
    } catch (error: any) {
      logger.error('启动定时同步任务失败:', error.message);
    }
  }

  /**
   * 停止定时同步任务
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('定时分类同步任务已停止');
    }
  }

  /**
   * 立即执行同步
   */
  async runNow(): Promise<void> {
    logger.info('立即执行分类同步任务...');
    try {
      const result = await syncOzonCategoriesForAllStores('ZH_HANS');
      logger.info(`同步完成: 总分类数 ${result.totalCount}, 同步数量 ${result.syncedCount}, 店铺数 ${result.storeCount}, 失败店铺数 ${result.failedStores.length}`);
    } catch (error: any) {
      logger.error('立即同步分类数据失败:', error.message);
    }
  }

  /**
   * 获取任务状态
   */
  getStatus(): 'running' | 'stopped' {
    return this.job ? 'running' : 'stopped';
  }
}

// 导出单例实例
const categorySyncScheduler = new CategorySyncScheduler();

export default categorySyncScheduler;
