import crypto from 'crypto';
import prisma from '../config/database';

const WORKER_TOKEN_PREFIX = 'owk_';
const DEFAULT_TASK_TTL_MS = 15 * 60 * 1000;

export type OzonBrowserTaskType =
  | 'preference_search'
  | 'product_by_url'
  | 'type_extract_batch'
  | 'cookie_refresh';

export type CreateBrowserTaskInput = {
  type: OzonBrowserTaskType;
  payload: unknown;
  storeId?: number | null;
  priority?: number;
  ttlMs?: number;
};

export type WorkerIdentity = {
  id: number;
  userId: number;
  status: string;
};

export const hashWorkerToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const createRawWorkerToken = (): string => {
  return `${WORKER_TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
};

const toPublicWorker = (worker: any) => {
  const { tokenHash: _tokenHash, ...publicWorker } = worker;
  return publicWorker;
};

export const createWorkerRegistration = async (userId: number, name: string) => {
  const token = createRawWorkerToken();
  const worker = await prisma.ozonBrowserWorker.create({
    data: {
      userId,
      name: name.trim() || '本机采集器',
      tokenHash: hashWorkerToken(token),
      status: 'offline',
    },
  });

  return {
    token,
    worker: toPublicWorker(worker),
  };
};

export const refreshWorkerRegistration = async (userId: number, name = '本机采集器') => {
  const token = createRawWorkerToken();
  const normalizedName = name.trim() || '本机采集器';
  const existingWorker = await prisma.ozonBrowserWorker.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const data = {
    name: normalizedName,
    tokenHash: hashWorkerToken(token),
    status: 'offline',
    capabilities: null as any,
    lastSeenAt: null,
  };

  const worker = existingWorker
    ? await prisma.ozonBrowserWorker.update({
        where: { id: existingWorker.id },
        data,
      })
    : await prisma.ozonBrowserWorker.create({
        data: {
          userId,
          ...data,
        },
      });

  return {
    token,
    worker: toPublicWorker(worker),
  };
};

export const authenticateWorkerToken = async (token: string): Promise<WorkerIdentity | null> => {
  const normalizedToken = token.trim();
  if (!normalizedToken.startsWith(WORKER_TOKEN_PREFIX)) {
    return null;
  }

  const worker = await prisma.ozonBrowserWorker.findFirst({
    where: {
      tokenHash: hashWorkerToken(normalizedToken),
      status: { not: 'disabled' },
    },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  });

  return worker;
};

export const getUserWorkers = async (userId: number) => {
  const workers = await prisma.ozonBrowserWorker.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  return workers.map(toPublicWorker);
};

export const deleteUserWorker = async (userId: number, workerId: number) => {
  const result = await prisma.ozonBrowserWorker.deleteMany({
    where: {
      id: workerId,
      userId,
    },
  });

  return result.count > 0;
};

export const createBrowserTask = async (userId: number, input: CreateBrowserTaskInput) => {
  const expiresAt = new Date(Date.now() + (input.ttlMs || DEFAULT_TASK_TTL_MS));
  return prisma.ozonBrowserTask.create({
    data: {
      userId,
      storeId: input.storeId || null,
      type: input.type,
      payload: input.payload as any,
      priority: input.priority || 0,
      status: 'pending',
      expiresAt,
    },
  });
};

export const getTaskForUser = async (userId: number, taskId: number) => {
  return prisma.ozonBrowserTask.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });
};

export const heartbeat = async (worker: WorkerIdentity, capabilities: unknown = null) => {
  return prisma.ozonBrowserWorker.update({
    where: { id: worker.id },
    data: {
      status: 'online',
      capabilities: capabilities as any,
      lastSeenAt: new Date(),
    },
  });
};

export const claimNextTask = async (worker: WorkerIdentity) => {
  const now = new Date();
  const task = await prisma.ozonBrowserTask.findFirst({
    where: {
      userId: worker.userId,
      OR: [
        { status: 'pending' },
        { status: 'claimed', expiresAt: { lt: now } },
        { status: 'running', expiresAt: { lt: now } },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  if (!task) {
    return null;
  }

  const claimed = await prisma.ozonBrowserTask.updateMany({
    where: {
      id: task.id,
      userId: worker.userId,
      OR: [
        { status: task.status },
        { status: 'claimed', expiresAt: { lt: now } },
        { status: 'running', expiresAt: { lt: now } },
      ],
    },
    data: {
      status: 'claimed',
      workerId: worker.id,
      claimedAt: now,
      errorCode: null,
      errorMessage: null,
      expiresAt: new Date(Date.now() + DEFAULT_TASK_TTL_MS),
    },
  });

  if (claimed.count === 0) {
    return null;
  }

  return prisma.ozonBrowserTask.findFirst({
    where: {
      id: task.id,
      userId: worker.userId,
      workerId: worker.id,
    },
  });
};

export const startTask = async (worker: WorkerIdentity, taskId: number) => {
  return prisma.ozonBrowserTask.updateMany({
    where: {
      id: taskId,
      userId: worker.userId,
      workerId: worker.id,
      status: 'claimed',
    },
    data: {
      status: 'running',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + DEFAULT_TASK_TTL_MS),
    },
  });
};

export const completeTask = async (worker: WorkerIdentity, taskId: number, result: unknown) => {
  return prisma.ozonBrowserTask.updateMany({
    where: {
      id: taskId,
      userId: worker.userId,
      workerId: worker.id,
      status: { in: ['claimed', 'running'] },
    },
    data: {
      status: 'success',
      result: result as any,
      errorCode: null,
      errorMessage: null,
      finishedAt: new Date(),
    },
  });
};

export const failTask = async (
  worker: WorkerIdentity,
  taskId: number,
  errorCode: string,
  errorMessage: string,
) => {
  return prisma.ozonBrowserTask.updateMany({
    where: {
      id: taskId,
      userId: worker.userId,
      workerId: worker.id,
      status: { in: ['claimed', 'running'] },
    },
    data: {
      status: 'failed',
      errorCode,
      errorMessage,
      finishedAt: new Date(),
    },
  });
};
