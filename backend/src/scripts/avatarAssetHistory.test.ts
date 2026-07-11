import assert from 'node:assert/strict';
import { addAvatarToHistory, isSystemAvatar, prepareAvatarHistory } from '../services/avatarService';

const productionAvatar = '/assets/t0-abc123.png';
const legacyAvatar = '/src/assets/images/avatars/t0.png';
const uploadedAvatar = '/images/uploaded-avatar.png';

assert.equal(isSystemAvatar(productionAvatar), true, 'Bundled production avatar URLs should be system avatars');
assert.equal(isSystemAvatar(legacyAvatar), true, 'Legacy source avatar URLs should remain compatible');
assert.equal(isSystemAvatar(uploadedAvatar), false, 'Uploaded avatars should not be system avatars');

assert.deepEqual(prepareAvatarHistory([productionAvatar, uploadedAvatar, legacyAvatar]), [uploadedAvatar]);
assert.deepEqual(addAvatarToHistory([uploadedAvatar], productionAvatar), [uploadedAvatar]);
