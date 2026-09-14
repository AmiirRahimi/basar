import { CountingShell } from '@/components/counting/CountingShell';
import { listClothes } from '@/actions/crud';
import { clothKindOptions, colorOptions, sizeOptions } from '@/actions/options';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function ClothesPage() {
  const [res, kinds, sizes, colors] = await Promise.all([
    listClothes(),
    clothKindOptions(),
    sizeOptions(),
    colorOptions(),
  ]);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="البسه" description={res.ok ? undefined : res.message}>
      <CrudPage
        resource="cloth"
        title="لباس"
        rows={rows}
        columns={[
          { header: 'کد', accessor: 'code' },
          { header: 'تعداد', accessor: 'count' },
          { header: 'نوع', accessor: '_type', format: 'name' },
          { header: 'سایز', accessor: '_size', format: 'name' },
          { header: 'رنگ', accessor: '_color', format: 'name' },
        ]}
        fields={[
          { name: 'code', label: 'کد', required: true },
          { name: 'count', label: 'تعداد', type: 'number', required: true },
          { name: '_type', label: 'نوع', type: 'relation', options: kinds, required: true },
          { name: '_size', label: 'سایز', type: 'relation', options: sizes, dependsOn: '_type', required: true },
          { name: '_color', label: 'رنگ', type: 'relation', options: colors },
          { name: 'boughtFee', label: 'قیمت خرید', type: 'number' },
          { name: 'wholesalePrice', label: 'قیمت عمده', type: 'number' },
          { name: 'minOrderQty', label: 'حداقل سفارش', type: 'number' },
        ]}
      />
    </CountingShell>
  );
}
