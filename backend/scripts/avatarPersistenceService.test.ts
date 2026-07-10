import assert from 'assert';
import {
  attachAvatarHistory,
  getUserAvatarState,
  updateUserAvatarState,
} from '../src/services/avatarPersistenceService';

type QueryCall = {
  type: 'query' | 'execute';
  sql: string;
  params: unknown[];
};

const calls: QueryCall[] = [];

const fakeClient = {
  async $queryRawUnsafe<T>(sql: string, ...params: unknown[]): Promise<T> {
    calls.push({ type: 'query', sql, params });

    return [
      {
        avatar: '/images/current-avatar.png',
        avatarHistory: '["/images/current-avatar.png","/images/previous-avatar.png"]',
      },
    ] as T;
  },
  async $executeRawUnsafe(sql: string, ...params: unknown[]): Promise<number> {
    calls.push({ type: 'execute', sql, params });
    return 1;
  },
};

async function main() {
  const avatarState = await getUserAvatarState(fakeClient as any, 7);
  assert.deepEqual(avatarState, {
    avatar: '/images/current-avatar.png',
    avatarHistory: ['/images/current-avatar.png', '/images/previous-avatar.png'],
  });

  const userWithHistory = await attachAvatarHistory(fakeClient as any, {
    id: 7,
    username: 'demo',
    avatar: '/images/current-avatar.png',
  });
  assert.deepEqual(userWithHistory, {
    id: 7,
    username: 'demo',
    avatar: '/images/current-avatar.png',
    avatarHistory: ['/images/current-avatar.png', '/images/previous-avatar.png'],
  });

  const updatedState = await updateUserAvatarState(fakeClient as any, 7, {
    avatar: null,
    avatarHistory: ['/images/new-avatar.png'],
  });
  assert.deepEqual(updatedState, {
    avatar: null,
    avatarHistory: ['/images/new-avatar.png'],
  });

  const executeCall = calls.find(call => call.type === 'execute');
  assert.ok(executeCall, 'should execute raw update');
  assert.match(executeCall!.sql, /UPDATE `users`/);
  assert.deepEqual(executeCall!.params, [null, '["/images/new-avatar.png"]', 7]);

  console.log('avatarPersistenceService.test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
