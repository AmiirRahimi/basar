import { CountingShell } from '@/components/counting/CountingShell';
import { listClothes } from '@/actions/crud';
import { getWorkspace } from '@/actions/workspace';
import {
  clothKindOptions,
  clothStyleOptions,
  colorOptions,
  fabricOptions,
  partnerOptions,
  personOptions,
  sizeOptions,
} from '@/actions/options';
import { CrudPage } from '@/components/counting/CrudPage';
import { clothUnitPrice } from '@/lib/cloth-price';
import { formatPacksFa, openingFromCloth, packsFromCloth, totalItems } from '@/lib/packs';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { saleState } from '@/lib/product-sale';
import { clothPlacementAccess, clothShareLabel } from '@/lib/cloth-share';
import { canWriteResource } from '@/lib/roles';

export default async function ClothesPage() {
  const [res, kinds, styles, sizes, colors, fabrics, tailors, washers, trimmers, printers, sellers, partners, workspace] =
    await Promise.all([
      listClothes(),
      clothKindOptions(),
      clothStyleOptions(),
      sizeOptions(),
      colorOptions(),
      fabricOptions(),
      personOptions('2'),
      personOptions('5'),
      personOptions('6'),
      personOptions('7'),
      personOptions('4'),
      partnerOptions(),
      getWorkspace(),
    ]);
  guardSession(res);
  const data = workspace.data;
  const brands = data?.brands || [];
  const stores = data?.stores || [];
  const rows = (Array.isArray(res.data) ? res.data : []).map((row: Record<string, any>) => {
    const current = packsFromCloth(row);
    const opening = openingFromCloth(row);
    const sale = saleState(row);
    return {
      ...row,
      // Form edits registered (opening) inventory; sales keep current packs/count on the server.
      packs: opening.packs,
      packSize: opening.packSize,
      unitPrice: clothUnitPrice(row),
      count: totalItems(current.packs) || Number(row.count || 0),
      openingCount: totalItems(opening.packs),
      packSummary: formatPacksFa(current.packs),
      openingSummary: formatPacksFa(opening.packs),
      saleLabel: sale.active ? `${sale.percent}٪` : '—',
      collectionLabel: row.newCollection ? 'جدید' : '—',
      publishLabel: row.published ? 'منتشر' : '—',
      shareLabel: clothShareLabel(row, brands, stores),
    };
  });
  const brandOptions = brands.map((brand) => ({ value: brand._id, label: brand.name || 'برند' }));
  const storeOptions = stores.map((store) => {
    const brand = brands.find((row) => row._id === store._brandId);
    return {
      value: store._id,
      label: brand?.name ? `${store.name || 'فروشگاه'} — ${brand.name}` : store.name || 'فروشگاه',
      parent: store._brandId,
    };
  });
  const placement = clothPlacementAccess({
    isPlatformAdmin: data?.isPlatformAdmin,
    maxBrands: data?.subscription?.maxBrands,
    maxStores: data?.subscription?.maxStores,
    allowPartners: data?.subscription?.allowPartners,
  });
  const allowWrite = canWriteResource(workspace.data?.storeRole || 'owner', 'cloth', workspace.data?.isPlatformAdmin);
  return (
    <CountingShell title="البسه" error={errorMessage(res)}>
      <CrudPage
        resource="cloth"
        title="لباس"
        rows={rows}
        allowWrite={allowWrite}
        defaults={{
          _brandIds: data?.activeBrandId || '',
          _storeIds: data?.activeStoreId || '',
          sellInAllStores: 'false',
        }}
        headingDescription={
          !placement.showPlacement
            ? 'لباس روی برند و فروشگاه فعال ثبت می‌شود.'
            : placement.assignPartner
              ? 'برند، فروشگاه و شریک این لباس را در بخش محل فروش انتخاب کنید.'
              : 'برند و فروشگاه این لباس را در بخش محل فروش انتخاب کنید.'
        }
        columns={[
          { header: 'کد', accessor: 'code' },
          { header: 'نوع', accessor: '_type', format: 'name' },
          { header: 'مدل', accessor: '_style', format: 'name' },
          { header: 'سایز', accessor: '_size', format: 'name' },
          { header: 'مانده', accessor: 'count' },
          { header: 'ثبت اولیه', accessor: 'openingCount' },
          { header: 'قیمت', accessor: 'unitPrice', format: 'toman' },
          { header: 'حراج', accessor: 'saleLabel' },
          { header: 'کالکشن', accessor: 'collectionLabel' },
          { header: 'وب‌سایت', accessor: 'publishLabel' },
          { header: 'اشتراک', accessor: 'shareLabel' },
          { header: 'مانده بسته‌ها', accessor: 'packSummary' },
          { header: 'بسته‌های ثبت‌شده', accessor: 'openingSummary' },
          { header: 'رنگ', accessor: '_color', format: 'name' },
          { header: 'پارچه', accessor: '_producedFrom', format: 'name' },
          { header: 'مصرف پارچه', accessor: 'amountUsed' },
          { header: 'خیاط', accessor: '_tailor', format: 'name' },
          { header: 'اجرت دوخت', accessor: 'tailorFee', format: 'toman' },
          { header: 'شست‌وشو', accessor: '_wash', format: 'name' },
          { header: 'اجرت شست', accessor: 'washFee', format: 'toman' },
          { header: 'خرجکار فروش', accessor: '_trim', format: 'name' },
          { header: 'اجرت خرجکار', accessor: 'trimFee', format: 'toman' },
          { header: 'چاپ', accessor: '_print', format: 'name' },
          { header: 'اجرت چاپ', accessor: 'printFee', format: 'toman' },
          { header: 'فروشنده', accessor: '_boughtFrom', format: 'name' },
          { header: 'شریک', accessor: '_partner', format: 'name' },
        ]}
        fields={[
          ...(placement.showPlacement
            ? [
                {
                  name: 'clothShare',
                  label: 'محل فروش',
                  type: 'cloth-share' as const,
                  group: 'محل فروش',
                  options: brandOptions,
                  storeOptions,
                  partnerOptions: partners,
                  assignPlace: placement.assignPlace,
                  assignPartner: placement.assignPartner,
                  defaultBrandId: data?.activeBrandId || '',
                  defaultStoreId: data?.activeStoreId || '',
                  required: placement.assignPlace,
                },
              ]
            : []),
          { name: 'code', label: 'کد', required: true },
          { name: 'packs', label: 'موجودی ثبت‌شده (اولیه)', type: 'packs', required: true },
          {
            name: '_type',
            label: 'نوع',
            type: 'relation',
            options: kinds,
            required: true,
            group: 'مشخصات لباس',
            row: true,
          },
          {
            name: '_style',
            label: 'مدل',
            type: 'relation',
            options: styles,
            dependsOn: '_type',
            required: true,
            group: 'مشخصات لباس',
            row: true,
          },
          {
            name: '_size',
            label: 'سایز',
            type: 'relation',
            options: sizes,
            dependsOn: '_type',
            required: true,
            group: 'مشخصات لباس',
            row: true,
          },
          {
            name: '_color',
            label: 'رنگ',
            type: 'relation',
            options: colors,
            group: 'مشخصات لباس',
            row: true,
          },
          { name: 'isProduced', label: 'تولید', type: 'boolean' },
          {
            name: '_producedFrom',
            label: 'پارچه',
            type: 'relation',
            options: fabrics,
            required: true,
            section: 'تولید',
            group: 'پارچه',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: 'amountUsed',
            label: 'مصرف پارچه',
            type: 'number',
            required: true,
            priceFrom: '_producedFrom',
            section: 'تولید',
            group: 'پارچه',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: '_tailor',
            label: 'خیاط',
            type: 'relation',
            options: tailors,
            section: 'تولید',
            group: 'خیاط',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: 'tailorFee',
            label: 'اجرت دوخت هر عدد',
            type: 'price',
            section: 'تولید',
            group: 'خیاط',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: '_wash',
            label: 'شست‌وشو',
            type: 'relation',
            options: washers,
            section: 'تولید',
            group: 'شست‌وشو',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: 'washFee',
            label: 'اجرت شست‌وشو هر عدد',
            type: 'price',
            section: 'تولید',
            group: 'شست‌وشو',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: '_trim',
            label: 'خرجکار فروش',
            type: 'relation',
            options: trimmers,
            section: 'تولید',
            group: 'خرجکار فروش',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: 'trimFee',
            label: 'اجرت خرجکار فروش هر عدد',
            type: 'price',
            section: 'تولید',
            group: 'خرجکار فروش',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: '_print',
            label: 'چاپ',
            type: 'relation',
            options: printers,
            section: 'تولید',
            group: 'چاپ',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: 'printFee',
            label: 'اجرت چاپ هر عدد',
            type: 'price',
            section: 'تولید',
            group: 'چاپ',
            row: true,
            visibleWhen: { field: 'isProduced', values: ['true'] },
          },
          {
            name: 'fromPastStock',
            label: 'موجودی قبلی فروشگاه (بدون فروشنده)',
            type: 'boolean',
            section: 'خرید / موجودی قبلی',
            sectionHint:
              'لباسی که از شخص دیگری خریده‌اید یا از قبل در فروشگاه موجود بوده را اینجا ثبت کنید.',
            visibleWhen: { field: 'isProduced', values: ['false'] },
          },
          {
            name: '_boughtFrom',
            label: 'فروشنده',
            type: 'relation',
            options: sellers,
            required: true,
            section: 'خرید / موجودی قبلی',
            sectionHint:
              'لباسی که از شخص دیگری خریده‌اید یا از قبل در فروشگاه موجود بوده را اینجا ثبت کنید.',
            visibleWhen: [
              { field: 'isProduced', values: ['false'] },
              { field: 'fromPastStock', values: ['false'] },
            ],
          },
          {
            name: 'boughtFee',
            label: 'قیمت هر عدد',
            type: 'price',
            required: true,
            section: 'خرید / موجودی قبلی',
            sectionHint:
              'لباسی که از شخص دیگری خریده‌اید یا از قبل در فروشگاه موجود بوده را اینجا ثبت کنید.',
            visibleWhen: { field: 'isProduced', values: ['false'] },
          },
          { name: 'extras', label: 'خرج‌های اضافه', type: 'extras' },
          {
            name: 'onSale',
            label: 'این محصول در حراج است',
            type: 'boolean',
            group: 'وضعیت فروشگاه',
            row: true,
          },
          {
            name: 'newCollection',
            label: 'کالکشن جدید',
            type: 'boolean',
            group: 'وضعیت فروشگاه',
            row: true,
          },
          ...(workspace.data?.isPlatformAdmin || workspace.data?.subscription?.allowProductShare
            ? [
                {
                  name: 'published',
                  label: 'انتشار در وب‌سایت',
                  type: 'boolean' as const,
                  group: 'وضعیت فروشگاه',
                  row: true,
                },
              ]
            : []),
          {
            name: 'discountPercent',
            label: 'درصد تخفیف',
            type: 'number',
            visibleWhen: { field: 'onSale', values: ['true'] },
          },
          {
            name: 'saleEndsAt',
            label: 'پایان حراج (اختیاری — برای تایمر روی کارت)',
            type: 'datetime',
            visibleWhen: { field: 'onSale', values: ['true'] },
          },
          { name: 'description', label: 'توضیح فروشگاه', type: 'textarea' },
          { name: 'images', label: 'تصاویر فروشگاه', type: 'images' },
        ]}
      />
    </CountingShell>
  );
}
