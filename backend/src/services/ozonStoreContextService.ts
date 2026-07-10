import prisma from '../config/database';

type UserContextRecord = {
  id: number;
  currentOzonStoreId: number | null;
};

export const STORE_CONTEXT_MISSING_MESSAGE = '请先在顶部选择当前操作店铺';

const getUserContextRecord = async (userId: number): Promise<UserContextRecord> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      currentOzonStoreId: true,
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  return user;
};

export const getUserOwnedStoreById = async (_userId: number, storeId: number) => {
  const store = await prisma.ozonStore.findFirst({
    where: {
      id: storeId,
    },
  });

  if (!store) {
    throw new Error('店铺不存在');
  }

  return store;
};

export const resolveUserStoreContext = async (userId: number) => {
  const user = await getUserContextRecord(userId);

  const tryStore = async (storeId: number | null) => {
    if (!storeId) return null;
    return prisma.ozonStore.findFirst({
      where: {
        id: storeId,
      },
    });
  };

  let currentStore = await tryStore(user.currentOzonStoreId);
  const updates: Partial<UserContextRecord> = {};

  if (!currentStore && user.currentOzonStoreId) {
    updates.currentOzonStoreId = null;
  }

  if (!currentStore) {
    currentStore = await prisma.ozonStore.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (currentStore) {
      updates.currentOzonStoreId = currentStore.id;
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  }

  const resolvedStore = currentStore || null;

  return {
    currentOzonStoreId: currentStore?.id || null,
    resolvedStoreId: resolvedStore?.id || null,
    resolvedStore,
  };
};

export const requireResolvedUserStore = async (userId: number) => {
  const context = await resolveUserStoreContext(userId);

  if (!context.resolvedStore) {
    throw new Error(STORE_CONTEXT_MISSING_MESSAGE);
  }

  return context;
};
