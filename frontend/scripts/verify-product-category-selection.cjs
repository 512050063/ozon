const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const utilPath = path.join(root, 'src', 'views', 'warehouse', 'product-library', 'categorySelection.ts');
const categoriesPath = path.join(root, 'src', 'assets', 'ozonCategories.json');

const source = fs.readFileSync(utilPath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const moduleRef = { exports: {} };
const fn = new Function('exports', 'module', 'require', transpiled);
fn(moduleRef.exports, moduleRef, require);

const { resolveCategorySelection } = moduleRef.exports;
const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8')).result;

const top = categories.find(item => item.children?.some(sub => sub.children?.length));
const sub = top.children.find(item => item.children?.length);
const type = sub.children[0];
const fullPath = [top.category_name, sub.category_name, type.type_name].join(' > ');

assert.deepEqual(resolveCategorySelection(categories, sub.description_category_id, type.type_id, ''), {
  fullPath,
  topCatId: top.description_category_id,
  subCatId: sub.description_category_id,
  typeId: type.type_id,
});

assert.deepEqual(resolveCategorySelection(categories, null, null, type.type_name), {
  fullPath,
  topCatId: top.description_category_id,
  subCatId: sub.description_category_id,
  typeId: type.type_id,
});

assert.deepEqual(resolveCategorySelection(categories, null, null, fullPath), {
  fullPath,
  topCatId: top.description_category_id,
  subCatId: sub.description_category_id,
  typeId: type.type_id,
});

console.log('product category selection verification passed');
