import mongoose, { Schema, type Model } from 'mongoose';

function modelOf<T>(name: string, schema: Schema, collection?: string): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema, collection);
}

const personSelect = '_id fullName city address phoneNumber role';

const UserSchema = new Schema(
  {
    fullName: { type: String, default: null },
    phonenumber: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null },
    city: { type: String, default: null },
    address: { type: String, default: null },
    password: { type: String, default: null },
    refreshToken: { type: String, default: null },
  },
  { collection: 'users' },
);

const UserSubscriptionSchema = new Schema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscriptionType: { type: Number, required: true },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
  },
  { collection: 'usersubscriptions' },
);

const OTPSchema = new Schema(
  {
    code: { type: String, required: true },
    type: { type: Number, required: true, default: 1 },
    receptor: { type: String, required: true },
    isUsed: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
  },
  { collection: 'otps' },
);

const BrandSchema = new Schema(
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

const StoreSchema = new Schema(
  {
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    _userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, default: 'فروشگاه اصلی' },
    address: { type: String, default: '' },
    phonenumbers: { type: String, default: '' },
    city: { type: Schema.Types.Mixed, default: '' },
    isMain: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'stores' },
);

const StoreMemberSchema = new Schema(
  {
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true, index: true },
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
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

const StoreBranchSchema = new Schema(
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

const PersonSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    address: String,
    fullName: String,
    city: Schema.Types.Mixed,
    phoneNumber: Schema.Types.Mixed,
    role: { type: String, required: true },
    sewingFee: Number,
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'people' },
);

const ClothKindSchema = new Schema({ name: { type: String, required: true } }, { collection: 'clothkinds' });
const ClothStyleSchema = new Schema(
  {
    name: { type: String, required: true },
    _clothKind: { type: Schema.Types.ObjectId, ref: 'ClothKind', required: true },
  },
  { collection: 'clothstyles' },
);
const ColorSchema = new Schema({ name: { type: String, required: true } }, { collection: 'colors' });
const SizeSchema = new Schema(
  {
    name: { type: String, required: true },
    _clothKind: { type: Schema.Types.ObjectId, ref: 'ClothKind' },
  },
  { collection: 'sizes' },
);

const FabricSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _mercer: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    _tailor: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    amount: { type: Number, required: true },
    priceForUnit: { type: Number, required: true },
    priceForShipingForUnit: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'fabrics' },
);

const ClothSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    sellInAllStores: { type: Boolean, default: false },
    _storeIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Store' }], default: [] },
    _type: { type: Schema.Types.ObjectId, ref: 'ClothKind' },
    _style: { type: Schema.Types.ObjectId, ref: 'ClothStyle' },
    _size: { type: Schema.Types.ObjectId, ref: 'Size' },
    _color: { type: Schema.Types.ObjectId, ref: 'Color' },
    _tailor: { type: Schema.Types.ObjectId, ref: 'Person' },
    _producedFrom: { type: Schema.Types.ObjectId, ref: 'Fabric' },
    _boughtFrom: { type: Schema.Types.ObjectId, ref: 'Person' },
    _wash: { type: Schema.Types.ObjectId, ref: 'Person' },
    amountUsed: Number,
    boughtFee: Number,
    tailorFee: Number,
    washFee: Number,
    code: { type: String, required: true },
    count: { type: Number, required: true },
    description: String,
    wholesalePrice: Number,
    minOrderQty: { type: Number, default: 12 },
    published: { type: Boolean, default: false },
    images: { type: [String], default: [] },
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'clothes' },
);

const InvoiceSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _brandId: { type: Schema.Types.ObjectId, ref: 'Brand' },
    _client: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    receiverAddress: String,
    invoiceNumber: { type: Number, required: true, unique: true },
    isSent: { type: Boolean, required: true, default: false },
    timeStamp: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { collection: 'invoices' },
);

const CustomerCartSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    _cloth: { type: Schema.Types.ObjectId, ref: 'Cloth', required: true },
    count: { type: Number, required: true },
    price: { type: Number, required: true },
    timeStamp: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { collection: 'customercarts' },
);

const CheckSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _owner: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    _sourceCheck: { type: Schema.Types.ObjectId, ref: 'Check' },
    direction: { type: String, default: 'in' },
    dueDate: { type: String, required: true },
    amount: { type: Number, required: true },
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

const PaymentSchema = new Schema(
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

const ReturnedSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    _returnedPerson: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
    description: String,
    timeStamp: { type: Date, required: true, default: Date.now },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'returneds' },
);

const ReturnedItemsSchema = new Schema(
  {
    _returned: { type: Schema.Types.ObjectId, ref: 'Returned', index: true },
    _cloth: { type: Schema.Types.ObjectId, ref: 'Cloth', required: true },
    count: { type: Number, required: true },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { collection: 'returneditems' },
);

const ChangeSchema = new Schema(
  {
    _storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    _user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entityName: { type: String, required: true },
    changeType: { type: Number, required: true },
    timeStamp: { type: Date, required: true, default: Date.now },
    _changedItemId: { type: Schema.Types.ObjectId, required: true },
  },
  { collection: 'changes' },
);

const ChangedItemsSchema = new Schema(
  {
    _changeId: { type: Schema.Types.ObjectId, ref: 'Change', required: true },
    changeKey: { type: String, required: true },
    oldValue: { type: String, required: true },
    newValue: { type: String, required: true },
  },
  { collection: 'changeditems' },
);

const PermisionSchema = new Schema({ name: { type: String, required: true } }, { collection: 'permisions' });
const UserPermisionSchema = new Schema(
  {
    _userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    _permision: { type: Schema.Types.ObjectId, ref: 'Permision', required: true },
  },
  { collection: 'userpermisions' },
);

const AttachmentSchema = new Schema(
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
export const OTP = modelOf<any>('OTP', OTPSchema);
export const Brand = modelOf<any>('Brand', BrandSchema);
export const Store = modelOf<any>('Store', StoreSchema);
export const StoreMember = modelOf<any>('StoreMember', StoreMemberSchema);
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
export const Attachment = modelOf<any>('Attachment', AttachmentSchema);

export const PERSON_POPULATE = personSelect;

export const CLOTH_POPULATE = [
  { path: '_tailor', select: personSelect },
  { path: '_wash', select: personSelect },
  { path: '_type' },
  { path: '_style' },
  { path: '_color' },
  { path: '_size', select: '_id name' },
  { path: '_producedFrom', populate: [{ path: '_mercer', select: personSelect }, { path: '_tailor', select: personSelect }] },
  { path: '_boughtFrom', select: `${personSelect} role` },
];
