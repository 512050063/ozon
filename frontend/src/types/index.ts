export interface Role {
  id: number;
  name: string;
  code: string;
  description: string | null;
  permissions?: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  roleId: number;
  role: Role;
  status: string;
  memberLevel: string;
  trialExpiration: string | null;
  memberExpiration: string | null;
  hasClaimedTrial: boolean;
  nickname: string | null;
  avatar: string | null;
  avatarHistory?: string[] | null;
  phone: string | null;
  wechatOpenid: string | null;
  wechatNickname: string | null;
  wechatAvatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  userId: number;
  titleOriginal: string;
  titleTranslated: string | null;
  descriptionOriginal: string | null;
  descriptionTranslated: string | null;
  price: number;
  rating: number | null;
  salesCount: number;
  category: string;
  specifications: any;
  images: any;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseItem {
  id: number;
  productId: number;
  status: string;
  inventoryQuantity: number;
  product: Product;
  createdAt: string;
  updatedAt: string;
}

export interface OzonListing {
  id: number;
  warehouseItemId: number;
  ozonProductId: string;
  listingStatus: string;
  price: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConfig {
  id: number;
  userId: number;
  platform: string;
  config: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  force?: boolean;
  deviceId?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface OzonStore {
  id: number;
  name: string;
  storeId: string;
  address: string;
  clientId: string;
  apiKey: string;
  apiUrl: string;
  status: 'active' | 'inactive';
  legalName: string | null;
  taxNumber: string | null;
  currency: string | null;
  country: string | null;
  isPremium: boolean;
  ratings: any;
  productCount: number;

  // 扩展字段
  ownershipForm: string | null;
  taxSystem: string | null;
  subscriptionType: string | null;
  rawApiData: any;

  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
  isCurrent?: boolean;
  pushUrl?: string;
  pushEnabled?: boolean;
  pushSecretCreatedAt?: string | null;
}

export interface OzonStoreContext {
  currentOzonStoreId: number | null;
  resolvedStoreId: number | null;
  store: OzonStore | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
