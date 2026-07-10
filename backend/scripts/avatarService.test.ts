import assert from 'assert';
import {
  addAvatarToHistory,
  applyAvatarHistoryState,
  cleanupDeletedAvatars,
  normalizeAvatarHistory,
  prepareAvatarHistory,
  removeAvatarHistoryEntry,
  removeAvatarFromHistory,
} from '../src/services/avatarService';

const systemAvatar1 = '/src/assets/images/avatars/t1.png';
const systemAvatar2 = '/src/assets/images/avatars/t2.png';
const localAvatar1 = '/images/avatar-1.png';
const localAvatar2 = '/images/avatar-2.png';
const localAvatar3 = '/images/avatar-3.png';
const localAvatar4 = '/images/avatar-4.png';
const localAvatar5 = '/images/avatar-5.png';
const localAvatar6 = '/images/avatar-6.png';

assert.deepEqual(normalizeAvatarHistory(null), []);
assert.deepEqual(normalizeAvatarHistory(['', systemAvatar1, 123, localAvatar1]), [systemAvatar1, localAvatar1]);
assert.deepEqual(
  prepareAvatarHistory([localAvatar1, localAvatar2, localAvatar1, localAvatar3, localAvatar4, localAvatar5, localAvatar6]),
  [localAvatar1, localAvatar2, localAvatar3, localAvatar4, localAvatar5, localAvatar6]
);

const dedupedHistory = addAvatarToHistory([systemAvatar1, localAvatar1, localAvatar2], localAvatar1);
assert.deepEqual(dedupedHistory, [localAvatar1, localAvatar2]);

const maxHistory = addAvatarToHistory(
  [systemAvatar1, systemAvatar2, localAvatar1, localAvatar2, localAvatar3],
  localAvatar4
);
assert.deepEqual(maxHistory, [localAvatar4, localAvatar1, localAvatar2, localAvatar3]);

const trimmedHistory = addAvatarToHistory(maxHistory, localAvatar5);
assert.deepEqual(trimmedHistory, [localAvatar5, localAvatar4, localAvatar1, localAvatar2, localAvatar3]);

const removedHistory = removeAvatarFromHistory([localAvatar5, localAvatar4, systemAvatar1], localAvatar4);
assert.deepEqual(removedHistory, [localAvatar5]);

const removedCurrentAvatar = removeAvatarHistoryEntry(
  localAvatar1,
  [localAvatar1, localAvatar2, systemAvatar1, localAvatar3],
  localAvatar1
);
assert.deepEqual(removedCurrentAvatar, {
  avatar: localAvatar2,
  avatarHistory: [localAvatar2, localAvatar3],
});

const preservedCurrentAvatar = applyAvatarHistoryState(localAvatar2, [localAvatar1, localAvatar2, systemAvatar1]);
assert.deepEqual(preservedCurrentAvatar, {
  avatar: localAvatar2,
  avatarHistory: [localAvatar1, localAvatar2],
});

const cleanedCurrentAvatar = cleanupDeletedAvatars(
  localAvatar1,
  [localAvatar1, systemAvatar1, localAvatar2],
  [localAvatar1]
);
assert.equal(cleanedCurrentAvatar.avatar, localAvatar2);
assert.deepEqual(cleanedCurrentAvatar.avatarHistory, [localAvatar2]);

const cleanedMultipleAvatars = cleanupDeletedAvatars(
  localAvatar6,
  [localAvatar6, localAvatar5, localAvatar4, systemAvatar2],
  [localAvatar6, localAvatar5, localAvatar4]
);
assert.equal(cleanedMultipleAvatars.avatar, null);
assert.deepEqual(cleanedMultipleAvatars.avatarHistory, []);

const cleanedToEmpty = cleanupDeletedAvatars(localAvatar3, [localAvatar3], [localAvatar3]);
assert.equal(cleanedToEmpty.avatar, null);
assert.deepEqual(cleanedToEmpty.avatarHistory, []);

console.log('avatarService.test passed');
