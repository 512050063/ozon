import ozonCategoriesRaw from '@/assets/ozonCategories.json';

interface OzonType { type_id: number; type_name: string; disabled: boolean }
interface OzonSubCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonType[] }
interface OzonTopCat { description_category_id: number; category_name: string; disabled: boolean; children: OzonSubCat[] }

export interface TreeNode {
  id: string;
  label: string;
  typeId?: number;
  topCatId: number;
  subCatId?: number;
  children: TreeNode[];
}

const ozonCategories = (ozonCategoriesRaw as any).result as OzonTopCat[];

const buildCategoryTree = (cats: OzonTopCat[]): TreeNode[] => {
  if (!cats || cats.length === 0) return [];
  return cats.filter(c => !c.disabled).map(top => ({
    id: `top-${top.description_category_id}`,
    label: top.category_name,
    topCatId: top.description_category_id,
    children: top.children.filter(s => !s.disabled).map(sub => ({
      id: sub.description_category_id != null ? `sub-${sub.description_category_id}` : `sub-${Math.random().toString(36).slice(2)}`,
      label: sub.category_name,
      topCatId: top.description_category_id,
      subCatId: sub.description_category_id,
      children: sub.children.filter(t => !t.disabled).map(t => ({
        id: `type-${t.type_id}`,
        label: t.type_name,
        typeId: t.type_id,
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        children: [],
      })),
    })),
  }));
};

let cachedCategoryTreeData: TreeNode[] | null = null;

export const getCategoryTreeData = () => {
  if (!cachedCategoryTreeData) {
    cachedCategoryTreeData = buildCategoryTree(ozonCategories);
  }
  return cachedCategoryTreeData;
};

export const findCategoryPath = (descriptionCategoryId: number, typeId?: number | null) => {
  for (const top of ozonCategories) {
    for (const sub of top.children || []) {
      if (sub.description_category_id !== descriptionCategoryId) continue;
      const type = (sub.children || []).find(item => item.type_id === typeId);
      return {
        topCatId: top.description_category_id,
        subCatId: sub.description_category_id,
        typeId: type?.type_id || typeId || 0,
        fullPath: [top.category_name, sub.category_name, type?.type_name].filter(Boolean).join(' / '),
      };
    }
  }
  return null;
};
