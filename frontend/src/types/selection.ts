// 添加商品表单类型
export interface AddProductForm {
  name: string;
  description: string;
  image: string;
  images?: any[];
  category: string;
  categoryLeaf?: string;
  brand: string;
  modelName: string;
  offerId?: string;
  sku?: string;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  grossWeight: number | null;
  alibabaId: string;
  barcode?: string;
  price: number | null;
  oldPrice?: number | null;
  descriptionCategoryId?: number | null;
  typeId?: number | null;
  attributes?: { [key: string]: any };
  variantAttributes?: any[];
  hiddenAttributes?: { [key: string]: any };
  templateSnapshot?: any;
  variantSummary?: string;
}

export interface AddProductSkuRow {
  id: string;
  offerId: string;
  sku: string;
  barcode: string;
  price: number | null;
  oldPrice: number | null;
  variantValues: Record<number, any>;
  variantAttributes: Array<{
    attributeId: number;
    name: string;
    value: string;
    valueId?: number;
  }>;
}

// 表单验证规则类型
export interface FormRules {
  [key: string]: {
    required?: boolean;
    message: string;
    trigger?: string;
    min?: number;
    max?: number;
    validator?: Function;
  }[];
}

// 商品类目类型
export interface CategoryOption {
  label: string;
  value: string;
}
