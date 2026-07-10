import assert from 'assert';
import {
  ACTIVE_SESSION_EXISTS,
  SESSION_KICKED,
  assertTokenSessionActive,
  createLoginSession,
  getSessionStatus,
} from '../src/services/loginSessionService';

type SessionRecord = {
  id: string;
  userId: number;
  status: string;
  deviceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: Date;
  lastSeenAt: Date;
  kickedAt: Date | null;
  logoutAt: Date | null;
  expireAt: Date | null;
  kickReason: string | null;
};

function createMemoryPrisma() {
  const users = new Map<number, { id: number; activeLoginSessionId: string | null }>();
  const sessions = new Map<string, SessionRecord>();

  const api = {
    users,
    sessions,
    user: {
      findUnique: async ({ where, select }: any) => {
        const user = users.get(where.id);
        if (!user) return null;
        if (!select) return { ...user };
        return Object.fromEntries(Object.keys(select).map(key => [key, (user as any)[key]]));
      },
      update: async ({ where, data }: any) => {
        const user = users.get(where.id);
        if (!user) throw new Error('user not found');
        const next = { ...user, ...data };
        users.set(where.id, next);
        return { ...next };
      },
    },
    userLoginSession: {
      findUnique: async ({ where }: any) => {
        const record = sessions.get(where.id);
        return record ? { ...record } : null;
      },
      create: async ({ data }: any) => {
        const record: SessionRecord = {
          id: data.id,
          userId: data.userId,
          status: data.status || 'active',
          deviceId: data.deviceId || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          loginAt: data.loginAt || new Date(),
          lastSeenAt: data.lastSeenAt || new Date(),
          kickedAt: data.kickedAt || null,
          logoutAt: data.logoutAt || null,
          expireAt: data.expireAt || null,
          kickReason: data.kickReason || null,
        };
        sessions.set(record.id, record);
        return { ...record };
      },
      update: async ({ where, data }: any) => {
        const record = sessions.get(where.id);
        if (!record) throw new Error('session not found');
        const next = { ...record, ...data };
        sessions.set(where.id, next);
        return { ...next };
      },
    },
    $transaction: async (callback: any) => callback(api),
  };

  return api;
}

async function run() {
  const prisma = createMemoryPrisma();
  prisma.users.set(1, { id: 1, activeLoginSessionId: null });

  const first = await createLoginSession(prisma as any, {
    userId: 1,
    deviceId: 'browser-a',
    ipAddress: '127.0.0.1',
    userAgent: 'A',
  });

  assert.equal(first.replacedSessionId, null);
  assert.equal(prisma.users.get(1)?.activeLoginSessionId, first.sessionId);

  await assert.rejects(
    () =>
      createLoginSession(prisma as any, {
        userId: 1,
        deviceId: 'browser-b',
        ipAddress: '127.0.0.2',
        userAgent: 'B',
        force: false,
      }),
    (error: any) => error?.code === ACTIVE_SESSION_EXISTS && error?.activeSession?.id === first.sessionId
  );

  const second = await createLoginSession(prisma as any, {
    userId: 1,
    deviceId: 'browser-b',
    ipAddress: '127.0.0.2',
    userAgent: 'B',
    force: true,
  });

  assert.equal(second.replacedSessionId, first.sessionId);
  assert.equal(prisma.sessions.get(first.sessionId)?.status, 'kicked');
  assert.equal(prisma.sessions.get(first.sessionId)?.kickReason, 'replaced_by_new_login');
  assert.equal(prisma.users.get(1)?.activeLoginSessionId, second.sessionId);

  await assert.rejects(
    () => assertTokenSessionActive(prisma as any, { userId: 1, sessionId: first.sessionId }),
    (error: any) => error?.code === SESSION_KICKED
  );

  await assertTokenSessionActive(prisma as any, { userId: 1, sessionId: second.sessionId });
  assert.equal((await getSessionStatus(prisma as any, { userId: 1, sessionId: first.sessionId })).status, 'kicked');
  assert.equal((await getSessionStatus(prisma as any, { userId: 1, sessionId: second.sessionId })).status, 'active');

  console.log('loginSessionService.test passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
