import type { StoreRole, StoreStaffRole } from './constants';
import type { ClothPack } from './packs';
import type { SubscriptionPlan } from './plans';

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
  remainingPeriodsOfSubscription?: number;
  /** @deprecated alias of remainingPeriodsOfSubscription */
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
  role?: string | number | string[];
  sewingFee?: number;
};

export type Brand = {
  _id: string;
  name: string;
  logo?: string;
  color?: string;
  description?: string;
  _userId?: string;
  websiteListing?: boolean;
  /** True when the brand owner was granted website publishing for all of their brands. */
  ownerWebsiteListing?: boolean;
};

export type StoreWarehouse = {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  phonenumbers?: string[];
  landlines?: string[];
};

export type StoreRecord = {
  _id: string;
  _brandId?: string | Brand;
  _userId?:
    | string
    | {
        _id?: string;
        fullName?: string;
        phonenumber?: string;
        address?: string;
        city?: string;
      };
  name?: string;
  address?: string;
  phonenumbers?: string;
  phones?: string[];
  landlines?: string[];
  warehouses?: StoreWarehouse[];
  city?: string | number;
  isMain?: boolean;
  catalogSlug?: string;
  websiteListing?: boolean;
};

export type StoreMember = {
  _id: string;
  _brandId?: string;
  _storeId?: string;
  _warehouseId?: string;
  phonenumber: string;
  fullName?: string;
  role: StoreStaffRole;
  status: 'pending' | 'active';
};

export type WorkspaceMember = StoreMember;

export type TeamMember = {
  _id: string;
  phonenumber: string;
  fullName?: string;
  address?: string;
  birthdate?: string;
  postalCode?: string;
  permissions: string[];
  status: 'pending' | 'accepted' | 'declined';
  _brandIds: string[];
  _storeIds: string[];
  inviteToken?: string;
  inviteLink?: string;
};

export type WorkspaceTeam = {
  _id: string;
  name: string;
  _brandIds: string[];
  _storeIds: string[];
  members: TeamMember[];
};

export type TeamInvite = {
  _id: string;
  teamId: string;
  teamName: string;
  ownerName?: string;
  brandNames: string[];
  storeNames: string[];
  permissions: string[];
  status: 'pending' | 'accepted' | 'declined';
  invitedAt?: string | Date;
  inviteLink?: string;
};

export type AccessSource = 'superuser' | 'owner' | 'staff' | 'team';

export type Partner = {
  _id: string;
  _userId?: string;
  name: string;
  phonenumber?: string;
  sharePercent?: number;
  allStores?: boolean;
  _brandIds?: string[];
  _storeIds?: string[];
};

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
    websiteListing?: boolean;
  };
  brands: WorkspaceBrand[];
  stores: WorkspaceStore[];
  partners: Partner[];
  activeBrandId: string;
  activeStoreId: string;
  storeRole: StoreRole;
  isPlatformAdmin: boolean;
  isSuperuser: boolean;
  permissions: string[];
  adminPermissions: string[];
  accessSource: AccessSource;
  teams: WorkspaceTeam[];
  teamPeople: TeamMember[];
  pendingInvites: TeamInvite[];
  subscriptionActive: boolean;
  subscription?: {
    active?: boolean;
    remainingPeriods: number;
    remainingPeriodUnits?: number;
    /** @deprecated use remainingPeriods */
    remainingDays?: number;
    planId?: string;
    planName?: string;
    billingCycle?: 'month' | 'year';
    periodsPurchased?: number;
    startDate?: string;
    currentPeriodStart?: string;
    endsAt?: string;
    endDate?: string;
    maxBrands?: number;
    maxStores?: number;
    allowPartners?: boolean;
    allowMembers?: boolean;
    allowClothImages?: boolean;
    allowProductShare?: boolean;
    allowShareSms?: boolean;
    notifyCustomersOnNewProduct?: boolean;
  };
  imageTokens?: number;
  imageTokensUnlimited?: boolean;
  planCatalog?: {
    annualDiscount: number;
    plans: SubscriptionPlan[];
  };
  purchases?: {
    _id: string;
    planName?: string;
    billingCycle?: string;
    price?: number;
    periodsPurchased?: number;
    remainingPeriods?: number;
    startDate?: string;
    endsAt?: string;
    endDate?: string;
    active?: boolean;
  }[];
  contextChanged?: boolean;
};

export type Cloth = {
  _id: string;
  code?: string | number;
  count?: number;
  packSize?: number;
  packs?: ClothPack[];
  /** Registered inventory when the cloth was entered / last restocked (first state). */
  openingCount?: number;
  openingPacks?: ClothPack[];
  isProduced?: boolean;
  fromPastStock?: boolean;
  amountUsed?: number;
  boughtFee?: number;
  tailorFee?: number;
  washFee?: number;
  trimFee?: number;
  printFee?: number;
  extras?: { kind?: string; price?: number; description?: string }[];
  published?: boolean;
  publishRequested?: boolean;
  description?: string;
  images?: string[];
  onSale?: boolean;
  discountPercent?: number;
  saleEndsAt?: string;
  newCollection?: boolean;
  sellInAllStores?: boolean;
  _brandIds?: string[];
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
  _trim?: Person | string;
  _print?: Person | string;
  _boughtFrom?: Person | string;
  _partner?: Partner | string;
};

export type Invoice = {
  _id: string;
  invoiceNumber?: string | number;
  receiverAddress?: string;
  isSent?: boolean;
  channel?: string;
  shareToken?: string;
  platformFee?: number;
  sellerPayout?: number;
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
  series?: string;
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
  style?: string;
  wholesalePrice: number;
  listPrice?: number;
  onSale?: boolean;
  discountPercent?: number;
  saleEndsAt?: string;
  newCollection?: boolean;
  minOrderQty: number;
  count: number;
  image: string;
  images: string[];
  color?: string;
  size?: string;
  packSize: number;
  packs: ClothPack[];
  categoryId?: string;
  styleId?: string;
  sizeId?: string;
  colorId?: string;
};

export type WholesaleCartItem = {
  productId: string;
  packs: ClothPack[];
  takenOrder: number[];
};

export type CatalogFilters = {
  q?: string;
  type?: string;
  style?: string;
  size?: string;
  color?: string;
  minPrice?: string;
  maxPrice?: string;
  stock?: string;
  sale?: string;
  new?: string;
};

export type PublicOrderLine = {
  name: string;
  packsLabel: string;
  count: number;
  price: number;
  total: number;
};

export type PublicOrderSummary = {
  id: string;
  invoiceNumber: string | number;
  total: number;
  platformFee?: number;
  sellerPayout?: number;
  lines: PublicOrderLine[];
};

export type StorefrontOrder = {
  _id: string;
  invoiceNumber: string | number;
  timeStamp?: string;
  customerName: string;
  customerPhone: string;
  sellerName: string;
  sellerPhone: string;
  sellerSheba?: string;
  sellerBankName?: string;
  sellerCard?: string;
  storeName: string;
  brandName: string;
  shareToken?: string;
  shareTitle?: string;
  total: number;
  feePercent: number;
  platformFee: number;
  sellerPayout: number;
  payoutStatus?: 'pending' | 'paid';
  payoutPaidAt?: string;
  payoutNote?: string;
  lines: PublicOrderLine[];
};

export type StorefrontOrderBoard = {
  orders: StorefrontOrder[];
  totals: {
    total: number;
    platformFee: number;
    sellerPayout: number;
    pendingPayout: number;
    paidPayout: number;
    count: number;
  };
  feePercent: number;
  isPlatformAdmin: boolean;
};

export type ProductShare = {
  _id: string;
  token: string;
  slug?: string;
  title?: string;
  showAll?: boolean;
  catalogSlug?: string;
  _clothIds: string[];
  clothCount?: number;
  timeStamp?: string;
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
  /** Current remaining stock (after sales). */
  packs?: ClothPack[];
  count?: number;
  /** Registered / first inventory. */
  openingPacks?: ClothPack[];
  openingCount?: number;
};
