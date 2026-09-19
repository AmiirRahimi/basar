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
import { formatPacksFa, packsFromCloth, totalItems } from '@/lib/packs';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { saleState } from '@/lib/product-sale';
import { canWriteResource } from '@/lib/roles';

export default async function ClothesPage() {
  const [res, kinds, styles, sizes, colors, fabrics, tailors, washers, sellers, partners, workspace] = await Promise.all([
    listClothes(),
    clothKindOptions(),
    clothStyleOptions(),
    sizeOptions(),
    colorOptions(),
    fabricOptions(),
    personOptions('2'),
    personOptions('5'),
    personOptions('4'),
    partnerOptions(),
    getWorkspace(),
  ]);
  guardSession(res);
  const rows = (Array.isArray(res.data) ? res.data : []).map((row: Record<string, any>) => {
    const stock = packsFromCloth(row);
    const sale = saleState(row);
    return {
      ...row,
      unitPrice: clothUnitPrice(row),
      count: totalItems(stock.packs) || Number(row.count || 0),
      packSummary: formatPacksFa(stock.packs),
      saleLabel: sale.active ? `${sale.percent}٪` : '—',
      collectionLabel: row.newCollection ? 'جدید' : '—',
      publishLabel: row.published ? 'منتشر' : '—',
    };
  });
  const data = workspace.data;
  const storeOptions = (data?.stores || []).map((store) => {
    const brand = (data?.brands || []).find((row) => row._id === store._brandId);
    return {
      value: store._id,
      label: brand?.name ? `${store.name || 'فروشگاه'} — ${brand.name}` : store.name || 'فروشگاه',
    };
  });
  const allowWrite = canWriteResource(workspace.data?.storeRole || 'owner', 'cloth', workspace.data?.isPlatformAdmin);
  return (
    <CountingShell title="البسه" error={errorMessage(res)}>
      <CrudPage
        resource="cloth"
        title="لباس"
        rows={rows}
        allowWrite={allowWrite}
        defaults={{ _storeId: data?.activeStoreId || '' }}
        columns={[
          { header: 'کد', accessor: 'code' },
          { header: 'نوع', accessor: '_type', format: 'name' },
          { header: 'مدل', accessor: '_style', format: 'name' },
          { header: 'سایز', accessor: '_size', format: 'name' },
          { header: 'تعداد', accessor: 'count' },
          { header: 'قیمت', accessor: 'unitPrice', format: 'toman' },
          { header: 'حراج', accessor: 'saleLabel' },
          { header: 'کالکشن', accessor: 'collectionLabel' },
          { header: 'وب‌سایت', accessor: 'publishLabel' },
          { header: 'فروشگاه', accessor: '_storeId', format: 'name' },
          { header: 'بسته‌ها', accessor: 'packSummary' },
          { header: 'رنگ', accessor: '_color', format: 'name' },
          { header: 'پارچه', accessor: '_producedFrom', format: 'name' },
          { header: 'مصرف پارچه', accessor: 'amountUsed' },
          { header: 'خیاط', accessor: '_tailor', format: 'name' },
          { header: 'اجرت دوخت', accessor: 'tailorFee', format: 'toman' },
          { header: 'شست‌وشو', accessor: '_wash', format: 'name' },
          { header: 'اجرت شست', accessor: 'washFee', format: 'toman' },
          { header: 'فروشنده', accessor: '_boughtFrom', format: 'name' },
          { header: 'شریک', accessor: '_partner', format: 'name' },
        ]}
        fields={[
          { name: '_storeId', label: 'فروشگاه', type: 'relation', options: storeOptions, required: true },
          { name: 'code', label: 'کد', required: true },
          { name: 'packs', label: 'موجودی بسته‌ها', type: 'packs', required: true },
          { name: '_type', label: 'نوع', type: 'relation', options: kinds, required: true },
          { name: '_style', label: 'مدل', type: 'relation', options: styles, dependsOn: '_type', required: true },
          { name: '_size', label: 'سایز', type: 'relation', options: sizes, dependsOn: '_type', required: true },
          { name: '_color', label: 'رنگ', type: 'relation', options: colors },
          { name: '_producedFrom', label: 'پارچه', type: 'relation', options: fabrics, required: true },
          {
            name: 'amountUsed',
            label: 'مصرف پارچه',
            type: 'number',
            required: true,
            priceFrom: '_producedFrom',
          },
          { name: '_tailor', label: 'خیاط', type: 'relation', options: tailors },
          { name: 'tailorFee', label: 'اجرت دوخت هر عدد', type: 'number' },
          { name: '_wash', label: 'شست‌وشو', type: 'relation', options: washers },
          { name: 'washFee', label: 'اجرت شست‌وشو هر عدد', type: 'number' },
          { name: '_boughtFrom', label: 'خرید از فروشنده', type: 'relation', options: sellers },
          { name: 'boughtFee', label: 'قیمت خرید هر عدد از فروشنده', type: 'number' },
          { name: '_partner', label: 'شریک فروش این لباس', type: 'relation', options: partners },
          { name: 'minOrderQty', label: 'حداقل سفارش عمده', type: 'number' },
          { name: 'wholesalePrice', label: 'قیمت عمده فروشگاه', type: 'number' },
          { name: 'onSale', label: 'این محصول در حراج است', type: 'boolean' },
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
          { name: 'newCollection', label: 'کالکشن جدید', type: 'boolean' },
          ...(workspace.data?.isPlatformAdmin
            ? [{ name: 'published', label: 'انتشار در وب‌سایت', type: 'boolean' as const }]
            : []),
          { name: 'description', label: 'توضیح فروشگاه', type: 'textarea' },
          { name: 'images', label: 'تصاویر فروشگاه', type: 'images' },
        ]}
      />
    </CountingShell>
  );
}
