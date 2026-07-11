const isAvatarPath = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const SYSTEM_AVATAR_PREFIX = '/src/assets/images/avatars/';
const BUNDLED_SYSTEM_AVATAR_PATTERN = /^\/assets\/t\d+(?:[-.][^/]*)?\.png(?:[?#].*)?$/i;

export const isSystemAvatar = (avatar: string | null | undefined): boolean =>
  isAvatarPath(avatar) &&
  (avatar.trim().startsWith(SYSTEM_AVATAR_PREFIX) || BUNDLED_SYSTEM_AVATAR_PATTERN.test(avatar.trim()));

export const normalizeAvatarHistory = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isAvatarPath).map(item => item.trim());
};

export const prepareAvatarHistory = (value: unknown): string[] => {
  const normalizedHistory = normalizeAvatarHistory(value);
  return normalizedHistory.filter(
    (item, index) => normalizedHistory.indexOf(item) === index && !isSystemAvatar(item)
  );
};

export const addAvatarToHistory = (history: unknown, avatar: string | null | undefined): string[] => {
  const normalizedHistory = prepareAvatarHistory(history);
  if (!isAvatarPath(avatar) || isSystemAvatar(avatar)) {
    return normalizedHistory;
  }

  const trimmedAvatar = avatar.trim();
  return [trimmedAvatar, ...normalizedHistory.filter(item => item !== trimmedAvatar)];
};

export const removeAvatarFromHistory = (history: unknown, avatar: string | null | undefined): string[] => {
  const normalizedHistory = prepareAvatarHistory(history);
  if (!isAvatarPath(avatar)) {
    return normalizedHistory;
  }

  const trimmedAvatar = avatar.trim();
  return normalizedHistory.filter(item => item !== trimmedAvatar);
};

export const applyAvatarHistoryState = (
  currentAvatar: string | null | undefined,
  history: unknown
) => {
  const avatarHistory = prepareAvatarHistory(history);
  const normalizedCurrentAvatar = isAvatarPath(currentAvatar) ? currentAvatar.trim() : null;

  if (normalizedCurrentAvatar && avatarHistory.includes(normalizedCurrentAvatar)) {
    return {
      avatar: normalizedCurrentAvatar,
      avatarHistory,
    };
  }

  return {
    avatar: avatarHistory[0] ?? null,
    avatarHistory,
  };
};

export const removeAvatarHistoryEntry = (
  currentAvatar: string | null | undefined,
  history: unknown,
  avatarToRemove: string | null | undefined
) => applyAvatarHistoryState(currentAvatar, removeAvatarFromHistory(history, avatarToRemove));

export const cleanupDeletedAvatars = (
  currentAvatar: string | null | undefined,
  history: unknown,
  deletedAvatars: string[]
) => {
  const normalizedDeleted = new Set(deletedAvatars.filter(isAvatarPath).map(item => item.trim()));
  const nextHistory = prepareAvatarHistory(history).filter(item => !normalizedDeleted.has(item));
  const normalizedCurrentAvatar = isAvatarPath(currentAvatar) ? currentAvatar.trim() : null;

  if (normalizedCurrentAvatar && !normalizedDeleted.has(normalizedCurrentAvatar)) {
    return {
      avatar: normalizedCurrentAvatar,
      avatarHistory: nextHistory,
    };
  }

  return {
    avatar: nextHistory[0] ?? null,
    avatarHistory: nextHistory,
  };
};

export const isManagedLocalAvatar = (avatar: string | null | undefined): boolean =>
  isAvatarPath(avatar) && avatar.trim().startsWith('/images/');
