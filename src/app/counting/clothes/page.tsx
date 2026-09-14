import { CountingShell } from '@/components/counting/CountingShell';
import { listClothes } from '@/actions/crud';
import { clothKindOptions, clothStyleOptions, colorOptions, fabricOptions, sizeOptions } from '@/actions/options';
import { CrudPage } from '@/components/counting/CrudPage';
import { clothUnitPrice } from '@/lib/cloth-price';

export default async function ClothesPage() {
  const [res, kinds, styles, sizes, colors, fabrics] = await Promise.all([
    listClothes(),
    clothKindOptions(),
    clothStyleOptions(),
    sizeOptions(),
    colorOptions(),
    fabricOptions(),
  ]);
  const rows = (Array.isArray(res.data) ? res.data : []).map((row: Record<string, any>) => ({
    ...row,
    unitPrice: clothUnitPrice(row),
  }));
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
          { header: 'مدل', accessor: '_style', format: 'name' },
          { header: 'سایز', accessor: '_size', format: 'name' },
          { header: 'رنگ', accessor: '_color', format: 'name' },
          { header: 'پارچه', accessor: '_producedFrom', format: 'name' },
          { header: 'مصرف پارچه', accessor: 'amountUsed' },
          { header: 'قیمت', accessor: 'unitPrice', format: 'toman' },
        ]}
        fields={[
          { name: 'code', label: 'کد', required: true },
          { name: 'count', label: 'تعداد', type: 'number', required: true },
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
        ]}
      />
    </CountingShell>
  );
}
