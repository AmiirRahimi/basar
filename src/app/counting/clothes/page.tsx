import { CountingShell } from '@/components/counting/CountingShell';
import { listClothes } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';
import { displayName } from '@/lib/format';

export default async function ClothesPage() {
  const res = await listClothes();
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
          { header: 'نوع', accessor: '_type', cell: (r) => displayName(r._type) },
          { header: 'سایز', accessor: '_size', cell: (r) => displayName(r._size) },
          { header: 'رنگ', accessor: '_color', cell: (r) => displayName(r._color) },
        ]}
        fields={[
          { name: 'code', label: 'کد' },
          { name: 'count', label: 'تعداد', type: 'number' },
          { name: '_type', label: 'شناسه نوع' },
          { name: '_size', label: 'شناسه سایز' },
          { name: 'boughtFee', label: 'قیمت خرید', type: 'number' },
          { name: 'wholesalePrice', label: 'قیمت عمده', type: 'number' },
          { name: 'minOrderQty', label: 'حداقل سفارش', type: 'number' },
        ]}
      />
    </CountingShell>
  );
}
