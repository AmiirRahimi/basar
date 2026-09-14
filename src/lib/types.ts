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
};

export type Cloth = {
  _id: string;
  code?: string | number;
  count?: number;
  boughtFee?: number;
  tailorFee?: number;
  washFee?: number;
  wholesalePrice?: number;
  minOrderQty?: number;
  published?: boolean;
  description?: string;
  images?: string[];
  _type?: { name?: string; _id?: string } | string;
  _size?: { name?: string; _id?: string } | string;
  _color?: { name?: string; _id?: string } | string;
  _tailor?: Person | string;
  _boughtFrom?: Person | string;
};

export type Invoice = {
  _id: string;
  invoiceNumber?: string | number;
  receiverAddress?: string;
  isSent?: boolean;
  timeStamp?: string;
  _client?: Person | string;
};

export type CartLine = {
  _id?: string;
  _invoice?: string;
  _cloth?: Cloth | string;
  count: number;
  price: number;
};

export type Check = {
  _id: string;
  amount?: number;
  serialNumber?: number;
  sayadiNumber?: number;
  dueDate?: string;
  isCashed?: boolean;
  isTransferred?: boolean;
  _owner?: Person | string;
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
