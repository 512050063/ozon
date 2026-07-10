import { randomUUID } from 'crypto';

export const ACTIVE_SESSION_EXISTS = 'ACTIVE_SESSION_EXISTS';
export const SESSION_KICKED = 'SESSION_KICKED';

export type LoginSessionStatus = 'active' | 'kicked' | 'logout' | 'expired' | 'invalid';

export class LoginSessionError extends Error {
  code: string;
  activeSession?: any;

  constructor(code: string, message: string, activeSession?: any) {
    super(message);
    this.name = 'LoginSessionError';
    this.code = code;
    this.activeSession = activeSession;
  }
}

type CreateLoginSessionInput = {
  userId: number;
  force?: boolean;
  deviceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type TokenSessionInput = {
  userId: number;
  sessionId?: string | null;
};

const selectActiveSessionFields = {
  id: true,
  userId: true,
  status: true,
  deviceId: true,
  ipAddress: true,
  userAgent: true,
  loginAt: true,
  lastSeenAt: true,
};

export async function createLoginSession(prisma: any, input: CreateLoginSessionInput) {
  return prisma.$transaction(async (tx: any) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, activeLoginSessionId: true },
    });

    if (!user) {
      throw new LoginSessionError('USER_NOT_FOUND', '用户不存在');
    }

    let activeSession = null;
    if (user.activeLoginSessionId) {
      activeSession = await tx.userLoginSession.findUnique({
        where: { id: user.activeLoginSessionId },
        select: selectActiveSessionFields,
      });
    }

    if (activeSession?.status === 'active' && !input.force) {
      throw new LoginSessionError(
        ACTIVE_SESSION_EXISTS,
        '该账号已在其他位置登录，继续登录将强制下线原设备',
        activeSession
      );
    }

    if (activeSession?.status === 'active' && input.force) {
      await tx.userLoginSession.update({
        where: { id: activeSession.id },
        data: {
          status: 'kicked',
          kickedAt: new Date(),
          kickReason: 'replaced_by_new_login',
        },
      });
    }

    const sessionId = randomUUID();
    await tx.userLoginSession.create({
      data: {
        id: sessionId,
        userId: input.userId,
        status: 'active',
        deviceId: input.deviceId || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        loginAt: new Date(),
        lastSeenAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: { activeLoginSessionId: sessionId },
    });

    return {
      sessionId,
      replacedSessionId: activeSession?.status === 'active' ? activeSession.id : null,
    };
  });
}

export async function assertTokenSessionActive(prisma: any, input: TokenSessionInput) {
  if (!input.sessionId) {
    throw new LoginSessionError(SESSION_KICKED, '您的账号已在其他位置登录，当前登录已失效');
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { activeLoginSessionId: true },
  });

  if (!user || user.activeLoginSessionId !== input.sessionId) {
    throw new LoginSessionError(SESSION_KICKED, '您的账号已在其他位置登录，当前登录已失效');
  }

  const session = await prisma.userLoginSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true },
  });

  if (!session || session.status !== 'active') {
    throw new LoginSessionError(SESSION_KICKED, '您的账号已在其他位置登录，当前登录已失效');
  }

  await prisma.userLoginSession.update({
    where: { id: input.sessionId },
    data: { lastSeenAt: new Date() },
  });
}

export async function getSessionStatus(prisma: any, input: TokenSessionInput): Promise<{ status: LoginSessionStatus }> {
  if (!input.sessionId) return { status: 'invalid' };

  const session = await prisma.userLoginSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, userId: true, status: true },
  });

  if (!session || session.userId !== input.userId) return { status: 'invalid' };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { activeLoginSessionId: true },
  });

  if (session.status === 'active' && user?.activeLoginSessionId === input.sessionId) {
    await prisma.userLoginSession.update({
      where: { id: input.sessionId },
      data: { lastSeenAt: new Date() },
    });
    return { status: 'active' };
  }

  return { status: session.status as LoginSessionStatus };
}

export async function logoutLoginSession(prisma: any, input: TokenSessionInput) {
  if (!input.sessionId) return;

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { activeLoginSessionId: true },
  });

  await prisma.userLoginSession.update({
    where: { id: input.sessionId },
    data: {
      status: 'logout',
      logoutAt: new Date(),
    },
  }).catch(() => undefined);

  if (user?.activeLoginSessionId === input.sessionId) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { activeLoginSessionId: null },
    });
  }
}
