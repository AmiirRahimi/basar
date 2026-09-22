import mongoose, { Schema, type Model } from 'mongoose';
import { MAX_CLOTH_IMAGES } from '@/lib/shop-cart';

function modelOf<T>(name: string, schema: Schema, collection?: string): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema, collection);
}

/** Skip mongoose's deep schema inference — it makes `tsc` run out of memory on Vercel. */
function defineSchema(definition: Record<string, unknown>, options?: Record<string, unknown>) {
  return new Schema(definition as never, options as never);
}

const personSelect = '_id fullName city address phoneNumber role';

const UserSchema = defineSchema(
  {
    fullName: { type: String, default: null },
    phonenumber: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null },
    city: { type: String, default: null },
    address: { type: String, default: null },
    sheba: { type: String, default: '' },
    bankName: { type: String, default: '' },
    cardNumber: { type: String, default: '' },
    password: { type: String, default: null },
    refreshToken: { type: String, default: null },
    imageTokens: { type: Number, default: 0 },
    timeStamp: { type: Date, default: Date.now },
  },
  { collection: 'users' },
);

const UserSubscriptionSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: String, default: 'starter' },
    billingCycle: { type: String, default: 'month' },
    subscriptionType: { type: Number, required: true },
    price: { type: Number, default: 0 },
    discountCode: { type: String, default: '' },
    originalPrice: { type: Number, default: 0 },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
  },
  { collection: 'usersubscriptions' },
);

const DiscountCodeSchema = defineSchema(
  {
    code: { type: String, required: true, unique: true, index: true },
    percent: { type: Number, required: true },
    maxUses: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
    note: { type: String, default: '' },
    _userIds: { type: [String], default: [] },
  },
  { collection: 'discountcodes' },
);

const OTPSchema = defineSchema(
  {
    code: { type: String, required: true },
    type: { type: Number, required: true, default: 1 },
    receptor: { type: String, required: true },
    isUsed: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'otps' },
);

const BrandSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    logo: { type: String, default: '' },
    color: { type: String, default: '#0f766e' },
    description: { type: String, default: '' },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'brands' },
);

const WarehouseSchema = defineSchema(
  {
    _id: { type: String, required: true },
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: Schema.Types.Mixed, default: '' },
    phonenumbers: { type: [String], default: [] },
    landlines: { type: [String], default: [] },
  },
  { _id: false },
);

const StoreSchema = defineSchema(
  {
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    _userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, default: 'فروشگاه اصلی' },
    address: { type: String, default: '' },
    phonenumbers: { type: String, default: '' },
    phones: { type: [String], default: [] },
    landlines: { type: [String], default: [] },
    warehouses: { type: [WarehouseSchema], default: [] },
    city: { type: Schema.Types.Mixed, default: '' },
    isMain: { type: Boolean, required: true, default: false },
    catalogSlug: { type: String, default: '', index: true },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'stores' },
);

const StoreMemberSchema = defineSchema(
  {
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    _warehouseId: { type: String, default: '' },
    phonenumber: { type: String, required: true, index: true },
    _userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    fullName: { type: String, default: '' },
    role: { type: String, required: true, enum: ['admin', 'seller', 'other'] },
    status: { type: String, required: true, enum: ['pending', 'active'], default: 'pending' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'storemembers' },
);

const PartnerSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    allStores: { type: Boolean, required: true, default: false },
    _brandIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Brand' }], default: [] },
    _storeIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Store' }], default: [] },
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null, index: true },
    name: { type: String, required: true },
    phonenumber: { type: String, default: '' },
    sharePercent: { type: Number, default: 0 },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'partners' },
);

const StoreBranchSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    landlines: { type: String, required: true },
    phonenumbers: { type: String, required: true },
    city: { type: Number, required: true },
    postalCode: { type: Number, required: true },
    isMain: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'storebranches' },
);

const PersonSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    address: String,
    fullName: String,
    city: Schema.Types.Mixed,
    phoneNumber: Schema.Types.Mixed,
    role: { type: [String], default: [] },
    sewingFee: Number,
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'people' },
);

const ClothKindSchema = defineSchema({ name: { type: String, required: true } }, { collection: 'clothkinds' });
const ClothStyleSchema = defineSchema(
  {
    name: { type: String, required: true },
    _clothKind: { type: Schema.Types.ObjectId, ref: 'ClothKind', required: true },
  },
  { collection: 'clothstyles' },
);
const ColorSchema = defineSchema({ name: { type: String, required: true } }, { collection: 'colors' });
const SizeSchema = defineSchema(
  {
    name: { type: String, required: true },
    _clothKind: { type: Schema.Types.ObjectId, ref: 'ClothKind' },
  },
  { collection: 'sizes' },
);

const FabricSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _mercer: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    _tailor: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    amount: { type: Number, required: true },
    priceForUnit: { type: Number, required: true },
    priceForShipingForUnit: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    extras: {
      type: [
        {
          kind: { type: String, required: true },
          price: { type: Number, required: true, default: 0 },
          description: { type: String, default: '' },
          _id: false,
        },
      ],
      default: [],
    },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'fabrics' },
);

const ClothSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    sellInAllStores: { type: Boolean, default: false },
    _brandIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Brand' }], default: [] },
    _storeIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Store' }], default: [] },
    _type: { type: Schema.Types.ObjectId, ref: 'ClothKind' },
    _style: { type: Schema.Types.ObjectId, ref: 'ClothStyle' },
    _size: { type: Schema.Types.ObjectId, ref: 'Size' },
    _color: { type: Schema.Types.ObjectId, ref: 'Color' },
    isProduced: { type: Boolean, default: false },
    fromPastStock: { type: Boolean, default: false },
    _tailor: { type: Schema.Types.ObjectId, ref: 'Person' },
    _producedFrom: { type: Schema.Types.ObjectId, ref: 'Fabric' },
    _boughtFrom: { type: Schema.Types.ObjectId, ref: 'Person' },
    _wash: { type: Schema.Types.ObjectId, ref: 'Person' },
    _trim: { type: Schema.Types.ObjectId, ref: 'Person' },
    _print: { type: Schema.Types.ObjectId, ref: 'Person' },
    _partner: { type: Schema.Types.ObjectId, ref: 'Partner' },
    amountUsed: Number,
    boughtFee: Number,
    tailorFee: Number,
    washFee: Number,
    trimFee: Number,
    printFee: Number,
    extras: {
      type: [
        {
          kind: { type: String, required: true },
          price: { type: Number, required: true, default: 0 },
          description: { type: String, default: '' },
          _id: false,
        },
      ],
      default: [],
    },
    code: { type: String, required: true },
    count: { type: Number, required: true },
    packSize: { type: Number, default: 1 },
    packs: {
      type: [
        {
          items: { type: Number, required: true },
          count: { type: Number, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    /** First registered inventory; sales only change `packs` / `count`. */
    openingCount: { type: Number },
    openingPacks: {
      type: [
        {
          items: { type: Number, required: true },
          count: { type: Number, required: true },
          _id: false,
        },
      ],
      default: undefined,
    },
    description: String,
    published: { type: Boolean, default: false },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value: unknown) => !Array.isArray(value) || value.length <= MAX_CLOTH_IMAGES,
        message: `حداکثر ${MAX_CLOTH_IMAGES} تصویر برای هر لباس مجاز است`,
      },
    },
    onSale: { type: Boolean, default: false },
    discountPercent: { type: Number, default: 0 },
    saleEndsAt: { type: Date, default: null },
    newCollection: { type: Boolean, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'clothes' },
);

const InvoiceSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand' },
    _client: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    receiverAddress: String,
    invoiceNumber: { type: Number, required: true, unique: true },
    publicToken: { type: String, index: true, sparse: true },
    channel: { type: String, default: '' },
    shareToken: { type: String, default: '' },
    _sellerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    platformFeePercent: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    sellerPayout: { type: Number, default: 0 },
    payoutStatus: { type: String, default: 'pending', enum: ['pending', 'paid'] },
    payoutPaidAt: { type: Date, default: null },
    payoutNote: { type: String, default: '' },
    isSent: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { collection: 'invoices' },
);

const CustomerCartSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    _cloth: { type: Schema.Types.ObjectId, ref: 'Cloth', required: true },
    count: { type: Number, required: true },
    packs: {
      type: [
        {
          items: { type: Number, required: true },
          count: { type: Number, required: true },
          _id: false,
        },
      ],
      default: [],
    },
    price: { type: Number, required: true },
    timeStamp: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { collection: 'customercarts' },
);

const CheckSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _owner: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    _sourceCheck: { type: Schema.Types.ObjectId, ref: 'Check' },
    direction: { type: String, default: 'in' },
    dueDate: { type: String, required: true },
    amount: { type: Number, required: true },
    series: String,
    serialNumber: Number,
    sayadiNumber: Number,
    isCashed: { type: Boolean, required: true, default: false },
    isReturned: { type: Boolean, required: true, default: false },
    isTransferred: { type: Boolean, required: true, default: false },
    isDeleted: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'checks' },
);

const PaymentSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    _person: { type: Schema.Types.ObjectId, ref: 'Person' },
    _check: { type: Schema.Types.ObjectId, ref: 'Check' },
    _checks: [{ type: Schema.Types.ObjectId, ref: 'Check' }],
    cashAmount: Number,
    cash: Number,
    checkAmount: Number,
    creditAmount: Number,
    discount: Number,
    description: String,
    isDeleted: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'payments' },
);

const ReturnedSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _returnedPerson: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    description: String,
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'returneds' },
);

const ReturnedItemsSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    _returned: { type: Schema.Types.ObjectId, ref: 'Returned', index: true },
    _invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    _cloth: { type: Schema.Types.ObjectId, ref: 'Cloth', required: true },
    count: { type: Number, required: true },
    price: Number,
    boughtPrice: Number,
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'returneditems' },
);

const ChangeSchema = defineSchema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    _user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entityName: { type: String, required: true },
    changeType: { type: Number, required: true },
    timeStamp: { type: Date, required: true, default: Date.now },
    _changedItemId: { type: Schema.Types.ObjectId, required: true },
    description: String,
  },
  { collection: 'changes' },
);

const ChangedItemsSchema = defineSchema(
  {
    _changeId: { type: Schema.Types.ObjectId, ref: 'Change', required: true },
    changeKey: { type: String, required: true },
    oldValue: { type: String, required: true },
    newValue: { type: String, required: true },
  },
  { collection: 'changeditems' },
);

const PermisionSchema = defineSchema({ name: { type: String, required: true } }, { collection: 'permisions' });
const UserPermisionSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    _permision: { type: Schema.Types.ObjectId, ref: 'Permision', required: true },
  },
  { collection: 'userpermisions' },
);

const ImageTokenPurchaseSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    packId: { type: String, required: true },
    tokens: { type: Number, required: true },
    price: { type: Number, required: true },
    timeStamp: { type: Date, required: true, default: Date.now },
    discountCode: { type: String, default: '' },
    originalPrice: { type: Number, default: 0 },
  },
  { collection: 'imagetokenpurchases' },
);

const ImageEditSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    _clothId: { type: Schema.Types.ObjectId, ref: 'Cloth', index: true },
    styleId: { type: String, required: true },
    sourceUrl: { type: String, required: true },
    resultUrl: { type: String, required: true },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'imageedits' },
);

const ProductShareSchema = defineSchema(
  {
    token: { type: String, required: true, unique: true, index: true },
    slug: { type: String, default: '', index: true },
    title: { type: String, default: '' },
    showAll: { type: Boolean, default: false, index: true },
    catalogSlug: { type: String, default: '' },
    _clothIds: { type: [Schema.Types.ObjectId], ref: 'Cloth', default: [] },
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand' },
    _userId: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'productshares' },
);

const TelegramPublishSchema = defineSchema(
  {
    _clothId: { type: Schema.Types.ObjectId, ref: 'Cloth', required: true, index: true },
    _userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    code: { type: String, default: '' },
    sizeName: { type: String, default: '' },
    colorName: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    orderUrl: { type: String, default: '' },
    caption: { type: String, default: '' },
    channelId: { type: String, default: '' },
    telegramMessageId: { type: Number, default: null },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: { type: String, default: '' },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'telegrampublishes' },
);

const TelegramInviteSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    _personIds: { type: [Schema.Types.ObjectId], ref: 'Person', default: [] },
    inviteLink: { type: String, default: '' },
    phones: { type: [String], default: [] },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'telegraminvites' },
);

const PlanCatalogSchema = defineSchema(
  {
    key: { type: String, required: true, unique: true, index: true },
    annualDiscount: { type: Number, default: 0.2 },
    plans: { type: Schema.Types.Mixed, default: [] },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'plancatalogs' },
);

const PaymentIntentSchema = defineSchema(
  {
    kind: { type: String, required: true, enum: ['storefront', 'subscription'] },
    status: { type: String, required: true, default: 'pending', enum: ['pending', 'paid', 'failed', 'expired'] },
    amount: { type: Number, required: true, default: 0 },
    authority: { type: String, default: '', index: true },
    driver: { type: String, default: 'mock' },
    refId: { type: String, default: '' },
    shareToken: { type: String, default: '' },
    snapshot: { type: Schema.Types.Mixed, default: {} },
    userId: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'paymentintents' },
);

const SmsCampaignSchema = defineSchema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    templateId: { type: String, default: 'custom' },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    audience: { type: String, default: 'customers' },
    phones: { type: [String], default: [] },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    packIds: { type: [String], default: [] },
    discountPercent: { type: Number, default: 0 },
    link: { type: String, default: '' },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'smscampaigns' },
);

const ConversationSchema = defineSchema(
  {
    channel: { type: String, required: true, enum: ['counting', 'shop'], index: true },
    status: { type: String, required: true, enum: ['open', 'closed'], default: 'open', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    visitorName: { type: String, default: '' },
    visitorPhone: { type: String, default: '' },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', default: null },
    subject: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, default: '' },
    unreadForAdmin: { type: Number, default: 0 },
    unreadForVisitor: { type: Number, default: 0 },
    guestTokenHash: { type: String, default: '', index: true },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'conversations' },
);

const ChatMessageSchema = defineSchema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    body: { type: String, required: true },
    sender: { type: String, required: true, enum: ['admin', 'user', 'visitor'] },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { collection: 'chatmessages' },
);

const AttachmentSchema = defineSchema(
  {
    size: Number,
    entityId: Schema.Types.ObjectId,
    fieldname: String,
    originalname: String,
    encoding: String,
    mimetype: String,
    destination: String,
    fileName: String,
    path: String,
  },
  { collection: 'attachments' },
);

export const User = modelOf<any>('User', UserSchema);
export const UserSubscription = modelOf<any>('UserSubscription', UserSubscriptionSchema);
export const DiscountCode = modelOf<any>('DiscountCode', DiscountCodeSchema);
export const OTP = modelOf<any>('OTP', OTPSchema);
export const Brand = modelOf<any>('Brand', BrandSchema);
export const Store = modelOf<any>('Store', StoreSchema);
export const StoreMember = modelOf<any>('StoreMember', StoreMemberSchema);
export const Partner = modelOf<any>('Partner', PartnerSchema);
export const StoreBranch = modelOf<any>('StoreBranch', StoreBranchSchema);
export const Person = modelOf<any>('Person', PersonSchema);
export const ClothKind = modelOf<any>('ClothKind', ClothKindSchema);
export const ClothStyle = modelOf<any>('ClothStyle', ClothStyleSchema);
export const Color = modelOf<any>('Color', ColorSchema);
export const Size = modelOf<any>('Size', SizeSchema);
export const Fabric = modelOf<any>('Fabric', FabricSchema);
export const Cloth = modelOf<any>('Cloth', ClothSchema);
export const Invoice = modelOf<any>('Invoice', InvoiceSchema);
export const CustomerCart = modelOf<any>('CustomerCart', CustomerCartSchema);
export const Check = modelOf<any>('Check', CheckSchema);
export const Payment = modelOf<any>('Payment', PaymentSchema);
export const Returned = modelOf<any>('Returned', ReturnedSchema);
export const ReturnedItems = modelOf<any>('ReturnedItems', ReturnedItemsSchema);
export const Change = modelOf<any>('Change', ChangeSchema);
export const ChangedItems = modelOf<any>('ChangedItems', ChangedItemsSchema);
export const Permision = modelOf<any>('Permision', PermisionSchema);
export const UserPermision = modelOf<any>('UserPermision', UserPermisionSchema);
export const ImageTokenPurchase = modelOf<any>('ImageTokenPurchase', ImageTokenPurchaseSchema);
export const ImageEdit = modelOf<any>('ImageEdit', ImageEditSchema);
export const ProductShare = modelOf<any>('ProductShare', ProductShareSchema);
export const PlanCatalog = modelOf<any>('PlanCatalog', PlanCatalogSchema);
export const PaymentIntent = modelOf<any>('PaymentIntent', PaymentIntentSchema);
export const TelegramPublish = modelOf<any>('TelegramPublish', TelegramPublishSchema);
export const TelegramInvite = modelOf<any>('TelegramInvite', TelegramInviteSchema);
export const SmsCampaign = modelOf<any>('SmsCampaign', SmsCampaignSchema);
export const Conversation = modelOf<any>('Conversation', ConversationSchema);
export const ChatMessage = modelOf<any>('ChatMessage', ChatMessageSchema);
export const Attachment = modelOf<any>('Attachment', AttachmentSchema);

export const PERSON_POPULATE = personSelect;

export const CLOTH_POPULATE = [
  { path: '_storeId', select: '_id name' },
  { path: '_tailor', select: personSelect },
  { path: '_wash', select: personSelect },
  { path: '_trim', select: personSelect },
  { path: '_print', select: personSelect },
  { path: '_type' },
  { path: '_style' },
  { path: '_color' },
  { path: '_size', select: '_id name' },
  { path: '_producedFrom', populate: [{ path: '_mercer', select: personSelect }, { path: '_tailor', select: personSelect }] },
  { path: '_boughtFrom', select: `${personSelect} role` },
  { path: '_partner', select: '_id name sharePercent allStores _brandIds _storeIds' },
];
