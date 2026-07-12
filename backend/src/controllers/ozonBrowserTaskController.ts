import { Request, Response } from 'express';
import {
  authenticateWorkerToken,
  claimNextTask,
  completeTask,
  createBrowserTask,
  createWorkerRegistration,
  deleteUserWorker,
  failTask,
  getTaskForUser,
  getUserWorkers,
  heartbeat,
  startTask,
  WorkerIdentity,
} from '../services/ozonBrowserTaskService';

const parseTaskId = (value: string): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getBearerToken = (req: Request): string => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : '';
};

const requireWorker = async (req: Request, res: Response): Promise<WorkerIdentity | null> => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: '缺少采集器令牌' });
    return null;
  }

  const worker = await authenticateWorkerToken(token);
  if (!worker) {
    res.status(401).json({ success: false, message: '采集器令牌无效或已禁用' });
    return null;
  }

  return worker;
};

export const createWorker = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const name = typeof req.body?.name === 'string' ? req.body.name : '本机采集器';
    const data = await createWorkerRegistration(userId, name);
    res.json({ success: true, data, message: '本机采集器已创建，请保存令牌' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '创建采集器失败' });
  }
};

export const listWorkers = async (req: Request, res: Response) => {
  try {
    const data = await getUserWorkers(req.user!.id);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '获取采集器失败' });
  }
};

export const deleteWorker = async (req: Request, res: Response) => {
  try {
    const workerId = parseTaskId(req.params.id);
    if (!workerId) {
      return res.status(400).json({ success: false, message: '采集器ID无效' });
    }

    const deleted = await deleteUserWorker(req.user!.id, workerId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: '采集器不存在' });
    }

    res.json({ success: true, message: '采集器已删除' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '删除采集器失败' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const { type, payload, storeId, priority } = req.body || {};
    if (!type || !payload) {
      return res.status(400).json({ success: false, message: '任务类型和任务参数不能为空' });
    }

    const data = await createBrowserTask(req.user!.id, {
      type,
      payload,
      storeId,
      priority,
    });
    res.json({ success: true, data, message: '任务已创建' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '创建任务失败' });
  }
};

export const getTask = async (req: Request, res: Response) => {
  try {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ success: false, message: '任务ID无效' });
    }

    const data = await getTaskForUser(req.user!.id, taskId);
    if (!data) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '获取任务失败' });
  }
};

export const workerHeartbeat = async (req: Request, res: Response) => {
  try {
    const worker = await requireWorker(req, res);
    if (!worker) return;

    const data = await heartbeat(worker, req.body?.capabilities || []);
    res.json({ success: true, data: { id: data.id, status: data.status, lastSeenAt: data.lastSeenAt } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '采集器心跳失败' });
  }
};

export const workerClaimTask = async (req: Request, res: Response) => {
  try {
    const worker = await requireWorker(req, res);
    if (!worker) return;

    const data = await claimNextTask(worker);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '领取任务失败' });
  }
};

export const workerStartTask = async (req: Request, res: Response) => {
  try {
    const worker = await requireWorker(req, res);
    if (!worker) return;
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ success: false, message: '任务ID无效' });
    }

    const result = await startTask(worker, taskId);
    res.json({ success: result.count > 0, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '开始任务失败' });
  }
};

export const workerCompleteTask = async (req: Request, res: Response) => {
  try {
    const worker = await requireWorker(req, res);
    if (!worker) return;
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ success: false, message: '任务ID无效' });
    }

    const result = await completeTask(worker, taskId, req.body?.result || {});
    res.json({ success: result.count > 0, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '完成任务失败' });
  }
};

export const workerFailTask = async (req: Request, res: Response) => {
  try {
    const worker = await requireWorker(req, res);
    if (!worker) return;
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
      return res.status(400).json({ success: false, message: '任务ID无效' });
    }

    const errorCode = String(req.body?.errorCode || 'TASK_FAILED');
    const errorMessage = String(req.body?.errorMessage || '采集任务失败');
    const result = await failTask(worker, taskId, errorCode, errorMessage);
    res.json({ success: result.count > 0, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || '标记任务失败失败' });
  }
};
