import * as mongo from './models';
import { fileModels } from './file-db';
import { dbEngine } from './db';

const STAFF_PHONE = '09123334444';
const SAMPLE_IMAGE =
  'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=80';

function models() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function asRows<T>(created: T | T[]): T[] {
  const list = Array.isArray(created) ? created : [created];
  return list.map((row: any) => (row?.toObject ? row.toObject() : row));
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function persianDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    calendar: 'persian',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = (parts.find((part) => part.type === 'month')?.value || '').padStart(2, '0');
  const day = (parts.find((part) => part.type === 'day')?.value || '').padStart(2, '0');
  return `${year}/${month}/${day}`;
}

async function ensureKind(ClothKind: any, name: string) {
  const existing = await ClothKind.findOne({ name }).lean();
  if (existing) return existing;
  const created = await ClothKind.create({ name });
  return created.toObject ? created.toObject() : created;
}

async function ensureNamed(Model: any, name: string, extra: Record<string, unknown> = {}) {
  const existing = await Model.findOne({ name, ...extra }).lean();
  if (existing) return existing;
  const created = await Model.create({ name, ...extra });
  return created.toObject ? created.toObject() : created;
}

export async function seedLookups() {
  await seedGlobalLookups();
  const { Store } = models();
  const stores = asRows(await Store.find({ isDeleted: false }).lean());
  for (const store of stores) {
    await seedStoreIfEmpty(store._id, store._brandId, store._userId);
  }
}

export async function seedStoreIfEmpty(storeId: unknown, brandId: unknown, userId: unknown) {
  if (!storeId) return;
  const { Person } = models();
  const existing = await Person.countDocuments({ _storeId: storeId });
  if (existing) return;
  await seedStoreDemo(storeId, brandId, userId);
}

async function seedGlobalLookups() {
  const { Color, Size, ClothKind, ClothStyle, Permision } = models();

  if (!(await Color.countDocuments())) {
    await Color.insertMany([
      { name: 'سرمه‌ای' },
      { name: 'خاکی' },
      { name: 'سفید' },
      { name: 'کرم' },
      { name: 'مشکی' },
      { name: 'آبی روشن' },
      { name: 'زغالی' },
    ]);
  }

  const jean = await ensureKind(ClothKind, 'شلوار جین');
  const cotton = await ensureKind(ClothKind, 'شلوار کتان');
  const shirt = await ensureKind(ClothKind, 'پیراهن');

  const styleSpecs = [
    { name: 'شلوار راسته', _clothKind: jean._id },
    { name: 'شلوار مام', _clothKind: jean._id },
    { name: 'شلوار اسلیم', _clothKind: jean._id },
    { name: 'شلوار چينو', _clothKind: cotton._id },
    { name: 'شلوار کلاسیک', _clothKind: cotton._id },
    { name: 'پیراهن آکسفورد', _clothKind: shirt._id },
    { name: 'پیراهن لینن', _clothKind: shirt._id },
  ];
  for (const style of styleSpecs) {
    await ensureNamed(ClothStyle, style.name, { _clothKind: style._clothKind });
  }

  for (const kind of [jean, cotton, shirt]) {
    const sizeCount = await Size.countDocuments({ _clothKind: kind._id });
    if (!sizeCount) {
      await Size.insertMany(['S', 'M', 'L', 'XL', 'XXL'].map((name) => ({ name, _clothKind: kind._id })));
    }
  }

  if (!(await Permision.countDocuments())) {
    await Permision.insertMany([{ name: 'مدیر' }, { name: 'فروشنده' }, { name: 'مشاهده' }]);
  }
}

async function seedStoreDemo(storeId: unknown, brandId: unknown, userId: unknown) {
  const m = models();
  const stamp = (days: number) => ({ timeStamp: daysAgo(days), isDeleted: false });

  if (userId && !(await m.UserSubscription.countDocuments({ _userId: userId }))) {
    await m.UserSubscription.create({
      _userId: userId,
      planId: 'starter',
      billingCycle: 'month',
      subscriptionType: 2,
      price: 500_000,
      startDate: daysAgo(50),
      endDate: daysAgo(20),
    });
    await m.UserSubscription.create({
      _userId: userId,
      planId: 'starter',
      billingCycle: 'month',
      subscriptionType: 2,
      price: 500_000,
      startDate: daysAgo(20),
      endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
    });
  }

  let staff = await m.User.findOne({ phonenumber: STAFF_PHONE }).lean();
  if (!staff) {
    staff = asRows(
      await m.User.create({
        fullName: 'مینا صالحی',
        phonenumber: STAFF_PHONE,
        city: 'تهران',
        address: 'ونک، خیابان ملاصدرا',
      }),
    )[0];
  }
  if (!(await m.UserSubscription.countDocuments({ _userId: staff._id }))) {
    await m.UserSubscription.create({
      _userId: staff._id,
      planId: 'brands',
      billingCycle: 'year',
      subscriptionType: 3,
      price: 11_520_000,
      startDate: daysAgo(40),
      endDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
    });
  }

  if (!(await m.OTP.countDocuments({ receptor: STAFF_PHONE }))) {
    await m.OTP.create({
      code: '12345',
      type: 1,
      receptor: STAFF_PHONE,
      isUsed: true,
      timeStamp: daysAgo(1),
    });
  }

  if (brandId && !(await m.StoreMember.countDocuments({ _storeId: storeId, isDeleted: false }))) {
    await m.StoreMember.insertMany([
      {
        _brandId: brandId,
        _storeId: storeId,
        phonenumber: STAFF_PHONE,
        _userId: staff._id,
        fullName: 'مینا صالحی',
        role: 'seller',
        status: 'active',
        invitedBy: userId,
        ...stamp(12),
      },
      {
        _brandId: brandId,
        _storeId: storeId,
        phonenumber: '09125556677',
        fullName: 'حسین کرمی',
        role: 'other',
        status: 'pending',
        invitedBy: userId,
        ...stamp(3),
      },
    ]);
  }

  if (!(await m.StoreBranch.countDocuments({ _storeId: storeId, isDeleted: false }))) {
    await m.StoreBranch.insertMany([
      {
        _storeId: storeId,
        name: 'شعبه بازار بزرگ',
        address: 'تهران، پانزده خرداد، سرای حاج حسن',
        landlines: '02155667788',
        phonenumbers: '09120001122',
        city: 0,
        postalCode: 1145698741,
        isMain: true,
        ...stamp(30),
      },
      {
        _storeId: storeId,
        name: 'انبار یافت‌آباد',
        address: 'تهران، یافت‌آباد، مجتمع پوشاک',
        landlines: '02166334455',
        phonenumbers: '09120003344',
        city: 0,
        postalCode: 1378912345,
        isMain: false,
        ...stamp(18),
      },
    ]);
  }

  const people = asRows(
    await m.Person.insertMany([
      {
        _storeId: storeId,
        fullName: 'رضا محمدی',
        phoneNumber: '09121234567',
        city: 'تهران',
        address: 'خیابان انقلاب، پلاک ۲۱۰',
        role: '1',
        ...stamp(25),
      },
      {
        _storeId: storeId,
        fullName: 'سارا کاظمی',
        phoneNumber: '09129876543',
        city: 'کرج',
        address: 'گوهردشت، فاز ۳',
        role: '1',
        ...stamp(21),
      },
      {
        _storeId: storeId,
        fullName: 'فروشگاه امید',
        phoneNumber: '09122223344',
        city: 'اصفهان',
        address: 'چهارباغ پایین، پاساژ سپاهان',
        role: '1',
        ...stamp(16),
      },
      {
        _storeId: storeId,
        fullName: 'استاد نوری',
        phoneNumber: '09131112233',
        city: 'تهران',
        address: 'خیابان جمهوری، کارگاه دوخت',
        role: '2',
        sewingFee: 55000,
        ...stamp(40),
      },
      {
        _storeId: storeId,
        fullName: 'خیاطی بهار',
        phoneNumber: '09134445566',
        city: 'تبریز',
        address: 'راسته کوچه',
        role: '2',
        sewingFee: 48000,
        ...stamp(33),
      },
      {
        _storeId: storeId,
        fullName: 'بنکدار امین',
        phoneNumber: '09125550000',
        city: 'تهران',
        address: 'بازار بزرگ، سرای پارچه',
        role: '3',
        ...stamp(45),
      },
      {
        _storeId: storeId,
        fullName: 'پارچه سرای نور',
        phoneNumber: '09127778899',
        city: 'مشهد',
        address: 'بازار رضا',
        role: '3',
        ...stamp(28),
      },
      {
        _storeId: storeId,
        fullName: 'علی رضایی',
        phoneNumber: '09126667788',
        city: 'تهران',
        address: 'مولوی، عمده‌فروشی پوشاک',
        role: '4',
        ...stamp(22),
      },
      {
        _storeId: storeId,
        fullName: 'شست‌وشوی پاکان',
        phoneNumber: '09123330011',
        city: 'تهران',
        address: 'شوش، کارگاه شست',
        role: '5',
        ...stamp(19),
      },
    ]),
  );

  const customer = people.find((row) => row.fullName === 'رضا محمدی')!;
  const customer2 = people.find((row) => row.fullName === 'سارا کاظمی')!;
  const shop = people.find((row) => row.fullName === 'فروشگاه امید')!;
  const tailor = people.find((row) => row.fullName === 'استاد نوری')!;
  const tailor2 = people.find((row) => row.fullName === 'خیاطی بهار')!;
  const mercer = people.find((row) => row.fullName === 'بنکدار امین')!;
  const mercer2 = people.find((row) => row.fullName === 'پارچه سرای نور')!;
  const seller = people.find((row) => row.fullName === 'علی رضایی')!;
  const washer = people.find((row) => row.fullName === 'شست‌وشوی پاکان')!;

  const fabrics = asRows(
    await m.Fabric.insertMany([
      {
        _storeId: storeId,
        _mercer: mercer._id,
        _tailor: tailor._id,
        amount: 180,
        priceForUnit: 285000,
        priceForShipingForUnit: 8000,
        discount: 1200000,
        ...stamp(24),
      },
      {
        _storeId: storeId,
        _mercer: mercer2._id,
        _tailor: tailor2._id,
        amount: 95,
        priceForUnit: 210000,
        priceForShipingForUnit: 6000,
        discount: 0,
        ...stamp(11),
      },
    ]),
  );

  const jean = await m.ClothKind.findOne({ name: 'شلوار جین' }).lean();
  const cotton = await m.ClothKind.findOne({ name: 'شلوار کتان' }).lean();
  const shirt = await m.ClothKind.findOne({ name: 'پیراهن' }).lean();
  const straight = await m.ClothStyle.findOne({ name: 'شلوار راسته' }).lean();
  const mom = await m.ClothStyle.findOne({ name: 'شلوار مام' }).lean();
  const chino = await m.ClothStyle.findOne({ name: 'شلوار چينو' }).lean();
  const oxford = await m.ClothStyle.findOne({ name: 'پیراهن آکسفورد' }).lean();
  const navy = await m.Color.findOne({ name: 'سرمه‌ای' }).lean();
  const khaki = await m.Color.findOne({ name: 'خاکی' }).lean();
  const white = await m.Color.findOne({ name: 'سفید' }).lean();
  const cream = await m.Color.findOne({ name: 'کرم' }).lean();
  const sizeM = await m.Size.findOne({ name: 'M', _clothKind: jean?._id }).lean();
  const sizeL = await m.Size.findOne({ name: 'L', _clothKind: jean?._id }).lean();
  const sizeXl = await m.Size.findOne({ name: 'XL', _clothKind: cotton?._id }).lean();
  const sizeShirt = await m.Size.findOne({ name: 'L', _clothKind: shirt?._id }).lean();

  const clothes = asRows(
    await m.Cloth.insertMany([
      {
        _storeId: storeId,
        _brandId: brandId,
        sellInAllStores: false,
        _storeIds: [storeId],
        _type: jean?._id,
        _style: straight?._id,
        _size: sizeM?._id,
        _color: navy?._id,
        _tailor: tailor._id,
        _producedFrom: fabrics[0]._id,
        _boughtFrom: seller._id,
        _wash: washer._id,
        amountUsed: 1.4,
        boughtFee: 410000,
        tailorFee: 55000,
        washFee: 18000,
        code: 'JN-101',
        packSize: 12,
        packs: [
          { items: 12, count: 10 },
          { items: 4, count: 2 },
          { items: 1, count: 1 },
        ],
        count: 129,
        description: 'شلوار جین راسته مردانه — بسته‌های ۱۲ تایی',
        wholesalePrice: 890000,
        minOrderQty: 12,
        published: true,
        onSale: true,
        discountPercent: 20,
        saleEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        images: [SAMPLE_IMAGE],
        ...stamp(14),
      },
      {
        _storeId: storeId,
        _brandId: brandId,
        sellInAllStores: false,
        _storeIds: [storeId],
        _type: jean?._id,
        _style: mom?._id,
        _size: sizeL?._id,
        _color: khaki?._id,
        _tailor: tailor2._id,
        _producedFrom: fabrics[0]._id,
        _wash: washer._id,
        amountUsed: 1.35,
        boughtFee: 395000,
        tailorFee: 48000,
        washFee: 18000,
        code: 'JN-204',
        packSize: 12,
        packs: [
          { items: 12, count: 6 },
          { items: 6, count: 1 },
        ],
        count: 78,
        description: 'شلوار جین مام',
        wholesalePrice: 920000,
        minOrderQty: 12,
        published: true,
        newCollection: true,
        images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1200&q=80'],
        ...stamp(9),
      },
      {
        _storeId: storeId,
        _brandId: brandId,
        sellInAllStores: false,
        _storeIds: [storeId],
        _type: cotton?._id,
        _style: chino?._id,
        _size: sizeXl?._id,
        _color: cream?._id,
        _tailor: tailor._id,
        _producedFrom: fabrics[1]._id,
        _boughtFrom: seller._id,
        amountUsed: 1.2,
        boughtFee: 310000,
        tailorFee: 52000,
        code: 'CT-330',
        packSize: 8,
        packs: [
          { items: 8, count: 8 },
          { items: 4, count: 2 },
          { items: 1, count: 3 },
        ],
        count: 75,
        description: 'شلوار کتان چينو',
        wholesalePrice: 720000,
        minOrderQty: 8,
        published: true,
        onSale: true,
        discountPercent: 15,
        images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=80'],
        ...stamp(7),
      },
      {
        _storeId: storeId,
        _brandId: brandId,
        sellInAllStores: false,
        _storeIds: [storeId],
        _type: shirt?._id,
        _style: oxford?._id,
        _size: sizeShirt?._id,
        _color: white?._id,
        _tailor: tailor2._id,
        _producedFrom: fabrics[1]._id,
        _wash: washer._id,
        amountUsed: 1.6,
        boughtFee: 265000,
        tailorFee: 40000,
        washFee: 12000,
        code: 'SH-412',
        packSize: 12,
        packs: [
          { items: 12, count: 4 },
          { items: 8, count: 1 },
        ],
        count: 56,
        description: 'پیراهن آکسفورد سفید',
        wholesalePrice: 680000,
        minOrderQty: 12,
        published: false,
        newCollection: true,
        images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80'],
        ...stamp(4),
      },
    ]),
  );

  const jeanCloth = clothes.find((row) => row.code === 'JN-101')!;
  const momCloth = clothes.find((row) => row.code === 'JN-204')!;
  const chinoCloth = clothes.find((row) => row.code === 'CT-330')!;
  const invoiceBase = Math.floor(Date.now() % 80000) + 10000;

  const invoices = asRows(
    await m.Invoice.insertMany([
      {
        _storeId: storeId,
        _brandId: brandId,
        _client: customer._id,
        receiverAddress: customer.address,
        invoiceNumber: invoiceBase,
        isSent: true,
        ...stamp(12),
      },
      {
        _storeId: storeId,
        _brandId: brandId,
        _client: customer2._id,
        receiverAddress: customer2.address,
        invoiceNumber: invoiceBase + 1,
        isSent: true,
        ...stamp(5),
      },
      {
        _storeId: storeId,
        _brandId: brandId,
        _client: shop._id,
        receiverAddress: shop.address,
        invoiceNumber: invoiceBase + 2,
        isSent: false,
        ...stamp(1),
      },
    ]),
  );

  await m.CustomerCart.insertMany([
    {
      _storeId: storeId,
      _invoice: invoices[0]._id,
      _cloth: jeanCloth._id,
      packs: [{ items: 12, count: 3 }],
      count: 36,
      price: 890000,
      ...stamp(12),
    },
    {
      _storeId: storeId,
      _invoice: invoices[0]._id,
      _cloth: chinoCloth._id,
      packs: [{ items: 8, count: 2 }],
      count: 16,
      price: 720000,
      ...stamp(12),
    },
    {
      _storeId: storeId,
      _invoice: invoices[1]._id,
      _cloth: momCloth._id,
      packs: [
        { items: 12, count: 1 },
        { items: 6, count: 1 },
      ],
      count: 18,
      price: 920000,
      ...stamp(5),
    },
    {
      _storeId: storeId,
      _invoice: invoices[2]._id,
      _cloth: jeanCloth._id,
      packs: [{ items: 12, count: 2 }],
      count: 24,
      price: 890000,
      ...stamp(1),
    },
  ]);

  const checks = asRows(
    await m.Check.insertMany([
      {
        _storeId: storeId,
        _owner: customer._id,
        direction: 'in',
        dueDate: persianDate(daysAgo(-8)),
        amount: 18000000,
        serialNumber: 14051201,
        sayadiNumber: 901122334455,
        isCashed: false,
        isReturned: false,
        isTransferred: false,
        ...stamp(12),
      },
      {
        _storeId: storeId,
        _owner: customer2._id,
        direction: 'in',
        dueDate: persianDate(daysAgo(20)),
        amount: 9500000,
        serialNumber: 14051108,
        sayadiNumber: 901122334466,
        isCashed: true,
        isReturned: false,
        isTransferred: false,
        ...stamp(20),
      },
      {
        _storeId: storeId,
        _owner: shop._id,
        direction: 'in',
        dueDate: persianDate(daysAgo(40)),
        amount: 4200000,
        serialNumber: 14051022,
        sayadiNumber: 901122334477,
        isCashed: false,
        isReturned: true,
        isTransferred: false,
        ...stamp(40),
      },
      {
        _storeId: storeId,
        _owner: tailor._id,
        direction: 'out',
        dueDate: persianDate(daysAgo(-20)),
        amount: 6500000,
        serialNumber: 887701,
        isCashed: false,
        isReturned: false,
        isTransferred: false,
        ...stamp(6),
      },
      {
        _storeId: storeId,
        _owner: mercer._id,
        direction: 'out',
        dueDate: persianDate(daysAgo(10)),
        amount: 22000000,
        serialNumber: 887655,
        isCashed: true,
        isReturned: false,
        isTransferred: false,
        ...stamp(15),
      },
    ]),
  );

  const incomingCheck = checks.find((row) => row.serialNumber === 14051201)!;
  const cashedCheck = checks.find((row) => row.serialNumber === 14051108)!;

  await m.Payment.insertMany([
    {
      _storeId: storeId,
      _invoice: invoices[0]._id,
      _person: customer._id,
      _check: incomingCheck._id,
      _checks: [incomingCheck._id],
      cash: 12000000,
      cashAmount: 12000000,
      checkAmount: 18000000,
      creditAmount: 0,
      discount: 500000,
      description: `نقد و چک بابت فاکتور ${invoiceBase}`,
      ...stamp(12),
    },
    {
      _storeId: storeId,
      _invoice: invoices[1]._id,
      _person: customer2._id,
      _check: cashedCheck._id,
      _checks: [cashedCheck._id],
      cash: 7000000,
      cashAmount: 7000000,
      checkAmount: 9500000,
      creditAmount: 600000,
      discount: 0,
      description: `پرداخت جزئی فاکتور ${invoiceBase + 1}`,
      ...stamp(5),
    },
    {
      _storeId: storeId,
      _person: tailor._id,
      cash: 2500000,
      cashAmount: 2500000,
      checkAmount: 0,
      creditAmount: 0,
      description: 'علی‌الحساب اجرت دوخت',
      ...stamp(8),
    },
  ]);

  const returned = asRows(
    await m.Returned.create({
      _storeId: storeId,
      _returnedPerson: customer._id,
      description: 'دو بسته ناقص از فاکتور قبلی برگشت داده شد',
      ...stamp(3),
    }),
  )[0];

  await m.ReturnedItems.insertMany([
    {
      _storeId: storeId,
      _returned: returned._id,
      _invoice: invoices[0]._id,
      _cloth: chinoCloth._id,
      count: 4,
      price: 720000,
      boughtPrice: 720000,
      isDeleted: false,
    },
    {
      _storeId: storeId,
      _returned: returned._id,
      _invoice: invoices[0]._id,
      _cloth: jeanCloth._id,
      count: 1,
      price: 890000,
      boughtPrice: 890000,
      isDeleted: false,
    },
  ]);

  const change = asRows(
    await m.Change.create({
      _storeId: storeId,
      _user: userId || staff._id,
      entityName: 'check',
      changeType: 1,
      _changedItemId: incomingCheck._id,
      description: 'ثبت چک دریافتی رضا محمدی',
      timeStamp: daysAgo(12),
    }),
  )[0];

  await m.ChangedItems.insertMany([
    {
      _changeId: change._id,
      changeKey: 'amount',
      oldValue: '',
      newValue: '18000000',
    },
    {
      _changeId: change._id,
      changeKey: 'dueDate',
      oldValue: '',
      newValue: String(incomingCheck.dueDate || ''),
    },
  ]);

  const permisions = asRows(await m.Permision.find({}).lean());
  const adminPerm = permisions.find((row) => row.name === 'مدیر');
  const sellerPerm = permisions.find((row) => row.name === 'فروشنده');
  if (userId && adminPerm && !(await m.UserPermision.countDocuments({ _userId: userId }))) {
    await m.UserPermision.create({ _userId: userId, _permision: adminPerm._id });
  }
  if (sellerPerm && !(await m.UserPermision.countDocuments({ _userId: staff._id }))) {
    await m.UserPermision.create({ _userId: staff._id, _permision: sellerPerm._id });
  }

  if (!(await m.Attachment.countDocuments({ entityId: invoices[0]._id }))) {
    await m.Attachment.create({
      size: 248120,
      entityId: invoices[0]._id,
      fieldname: 'scan',
      originalname: `invoice-${invoiceBase}.jpg`,
      encoding: '7bit',
      mimetype: 'image/jpeg',
      destination: 'uploads',
      fileName: `invoice-${invoiceBase}.jpg`,
      path: `/uploads/invoice-${invoiceBase}.jpg`,
    });
  }
}
