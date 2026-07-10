import { prepareAvatarHistory } from './avatarService';

type AvatarDbClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

type AvatarStateRow = {
  avatar: string | null;
  avatarHistory: unknown;
};

export type UserAvatarState = {
  avatar: string | null;
  avatarHistory: string[];
};

const parseAvatarHistory = (value: unknown): string[] => {
  if (typeof value === 'string') {
    try {
      return prepareAvatarHistory(JSON.parse(value));
    } catch {
      return [];
    }
  }

  return prepareAvatarHistory(value);
};

export const getUserAvatarState = async (
  db: AvatarDbClient,
  userId: number
): Promise<UserAvatarState | null> => {
  const rows = await db.$queryRawUnsafe<AvatarStateRow[]>(
    'SELECT `avatar`, `avatarHistory` FROM `users` WHERE `id` = ? LIMIT 1',
    userId
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    avatar: typeof row.avatar === 'string' && row.avatar.trim().length > 0 ? row.avatar : null,
    avatarHistory: parseAvatarHistory(row.avatarHistory),
  };
};

export const updateUserAvatarState = async (
  db: AvatarDbClient,
  userId: number,
  state: UserAvatarState
): Promise<UserAvatarState> => {
  await db.$executeRawUnsafe(
    'UPDATE `users` SET `avatar` = ?, `avatarHistory` = ?, `updatedAt` = NOW() WHERE `id` = ?',
    state.avatar,
    JSON.stringify(prepareAvatarHistory(state.avatarHistory)),
    userId
  );

  return {
    avatar: state.avatar,
    avatarHistory: prepareAvatarHistory(state.avatarHistory),
  };
};

export const attachAvatarHistory = async <T extends { id: number; avatar?: string | null }>(
  db: AvatarDbClient,
  user: T
): Promise<T & { avatarHistory: string[] }> => {
  const state = await getUserAvatarState(db, user.id);

  return {
    ...user,
    avatarHistory: state?.avatarHistory ?? [],
  };
};
