import assert from 'assert';
import {
  buildOzonTranslationItems,
  resolveOzonErrorTranslation,
} from '../src/services/ozonErrorCodeService';

const cachedCodes = [
  {
    code: 'SPU_ALREADY_EXISTS_IN_ANOTHER_ACCOUNT',
    messageRu: 'SPU_ALREADY_EXISTS_IN_ANOTHER_ACCOUNT{"DUPLICATES":[{"OFFERID":"742312174"}]}',
    messageZh: '该 SPU 已存在于另一个账号',
  },
  {
    code: 'STATUS:Не обновлен',
    messageRu: 'Не обновлен',
    messageZh: '未更新',
  },
];

assert.strictEqual(
  resolveOzonErrorTranslation('SPU_ALREADY_EXISTS_IN_ANOTHER_ACCOUNT', 'raw', cachedCodes),
  '该 SPU 已存在于另一个账号'
);

assert.strictEqual(
  resolveOzonErrorTranslation('ERR_IMAGE_REQUIRED', 'raw', cachedCodes),
  '缺少商品图片'
);

assert.strictEqual(
  resolveOzonErrorTranslation('', 'Не обновлен', cachedCodes),
  '未更新'
);

assert.strictEqual(
  resolveOzonErrorTranslation('', '原始提示', cachedCodes),
  '原始提示'
);

assert.strictEqual(
  resolveOzonErrorTranslation('error_attribute_values_out_of_range', 'Attribute value not fresh', cachedCodes),
  '属性值不是最新值，请重新选择属性值'
);

assert.strictEqual(
  resolveOzonErrorTranslation(
    'STATUS_TOOLTIP:Нет на складе\nМожно создать новую поставку или указать количество на своем складе',
    '',
    cachedCodes
  ),
  '没有库存。可以创建新的供货，或填写自己仓库中的库存数量'
);

const translationItems = buildOzonTranslationItems([
  { code: 'ERR_A', message: 'Ошибка A', level: 'ERROR_LEVEL_ERROR' },
  { code: 'ERR_A', message: 'Ошибка A', level: 'ERROR_LEVEL_ERROR' },
  { code: '', message: 'Длинное одинаковое сообщение', level: 'STATUS_INFO' },
  { code: '', message: 'Длинное одинаковое сообщение', level: 'STATUS_INFO' },
]);

assert.deepStrictEqual(
  translationItems.map(item => item.code),
  ['ERR_A', 'TEXT:Длинное одинаковое сообщение']
);

console.log('ozonErrorCodeService.translation.test passed');
