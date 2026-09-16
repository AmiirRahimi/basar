import type { StoreRole, StoreStaffRole } from './constants';
import type { ClothPack } from './packs';

export type { StoreRole, StoreStaffRole, ClothPack };

export type NestEnvelope<T = unknown> = {
  hasError?: boolean;
  message?: string;
  resVal?: T & {
    result?: unknown;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    numberOfPagination?: number;
    amountOfAllOfTheData?: number;
  };
};

export type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
  access?: string;
  refresh?: string;
};

export type UserInfo = {
  _id?: string;
  fullName?: string;
  phonenumber?: string | number;
  phoneNumber?: string | number;
  remainingDaysOfSubscription?: number;
  permisions?: string[];
  permissions?: string[];
};

export type Person = {
  _id: string;
  fullName: string;
  phoneNumber?: number | string;
  city?: string | number;
  address?: string;
  role?: string | number;
  sewingFee?: number;
};

export type Brand = {
  _id: string;
  name: string;
  logo?: string;
  color?: string;
  description?: string;
  _userId?: string;
};

export type StoreRecord = {
  _id: string;
  _brandId?: string | Brand;
  name?: string;
  address?: string;
  phonenumbers?: string;
  city?: string | number;
  isMain?: boolean;
};

export type StoreMember = {
  _id: string;
  _brandId?: string;
  _storeId?: string;
  phonenumber: string;
  fullName?: string;
  role: StoreStaffRole;
  status: 'pending' | 'active';
};

export type WorkspaceMember = StoreMember;

export type WorkspaceStore = StoreRecord & {
  _brandId: string;
  members: WorkspaceMember[];
};

export type WorkspaceBrand = Brand & {
  storeCount: number;
  memberCount: number;
};

export type Workspace = {
  user: {
    _id: string;
    fullName?: string;
    phonenumber: string;
  };
  brands: WorkspaceBrand[];
  stores: WorkspaceStore[];
  activeBrandId: string;
  activeStoreId: string;
  storeRole: StoreRole;
  isPlatformAdmin: boolean;
  contextChanged?: boolean;
};

export type Cloth = {
  _id: string;
  code?: string | number;
  count?: number;
  packSize?: number;
  packs?: ClothPack[];
  amountUsed?: number;
  boughtFee?: number;
  tailorFee?: number;
  washFee?: number;
  wholesalePrice?: number;
  minOrderQty?: number;
  published?: boolean;
  description?: string;
  images?: string[];
  sellInAllStores?: boolean;
  _storeIds?: string[];
  _brandId?: string;
  _storeId?: string | StoreRecord;
  _type?: { name?: string; _id?: string } | string;
  _style?: { name?: string; _id?: string } | string;
  _size?: { name?: string; _id?: string } | string;
  _color?: { name?: string; _id?: string } | string;
  _producedFrom?: {
    _id?: string;
    amount?: number;
    priceForUnit?: number;
    priceForShipingForUnit?: number;
    discount?: number;
    _mercer?: Person | string;
  } | string;
  _tailor?: Person | string;
  _wash?: Person | string;
  _boughtFrom?: Person | string;
};

export type Invoice = {
  _id: string;
  invoiceNumber?: string | number;
  receiverAddress?: string;
  isSent?: boolean;
  timeStamp?: string;
  _client?: Person | string;
  _storeId?: string | StoreRecord;
  _brandId?: string | Brand;
  storeName?: string;
  brandName?: string;
};

export type CartLine = {
  _id?: string;
  _invoice?: string;
  _cloth?: Cloth | string;
  count: number;
  packs?: ClothPack[];
  price: number;
};

export type Check = {
  _id: string;
  amount?: number;
  serialNumber?: number;
  sayadiNumber?: number;
  dueDate?: string;
  direction?: 'in' | 'out' | string;
  isCashed?: boolean;
  isReturned?: boolean;
  isTransferred?: boolean;
  _owner?: Person | string;
  _sourceCheck?: string | Check;
  isUsedInPayment?: boolean;
};

export type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  wholesalePrice: number;
  minOrderQty: number;
  count: number;
  image: string;
  color?: string;
  size?: string;
};

export type WholesaleCartItem = {
  productId: string;
  qty: number;
};

/** An option for a form dropdown. `parent` links the option to the owning record
 *  of a dependent field, e.g. a size belongs to a cloth kind. */
export type FieldOption = {
  label: string;
  value: string;
  parent?: string;
  address?: string;
  price?: number;
  packSize?: number;
  packs?: ClothPack[];
  count?: number;
};
