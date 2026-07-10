// 图片类型
export interface ImageItem {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

// 采集库商品类型
export interface CollectionItem {
  id: number;
  name: string;
  description: string;
  imageId?: number;
  image?: ImageItem;
  images?: ImageItem[];
  category: string;
  brand: string;
  modelName: string;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  grossWeight: number;
  alibabaId: string;
  supplier: string;
  price: number;
  isProcessed: boolean;
}

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

// 选品库商品类型
export interface ProductItem {
  status: string;
  supplier: any;
  id: number;
  name: string;
  description: string;
  imageId?: number;
  image?: ImageItem;
  category: string;
  brand: string;
  modelName: string;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  grossWeight: number;
  alibabaId: string;
  price: number;
  isListed: boolean;
  ozonProductId?: string;
  ozonStoreId?: number;
  createdAt: string;
  updatedAt: string;
}
