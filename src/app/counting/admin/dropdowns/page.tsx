import { CountingShell } from '@/components/counting/CountingShell';
import { listClothKinds, listColors, listSizes } from '@/actions/crud';
import { clothKindOptions } from '@/actions/options';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function DropdownsPage() {
  const [colors, sizes, kinds, kindOptions] = await Promise.all([
    listColors(),
    listSizes(),
    listClothKinds(),
    clothKindOptions(),
  ]);
  return (
    <CountingShell title="لیست‌های کمکی">
      <div className="grid gap-8">
        <section>
          <h3 className="mb-3 font-medium">رنگ</h3>
          <CrudPage
            resource="color"
            title="رنگ"
            rows={Array.isArray(colors.data) ? colors.data : []}
            columns={[{ header: 'نام', accessor: 'name' }]}
            fields={[{ name: 'name', label: 'نام', required: true }]}
          />
        </section>
        <section>
          <h3 className="mb-3 font-medium">سایز</h3>
          <CrudPage
            resource="size"
            title="سایز"
            rows={Array.isArray(sizes.data) ? sizes.data : []}
            columns={[
              { header: 'نام', accessor: 'name' },
              { header: 'نوع لباس', accessor: '_clothKind', format: 'name' },
            ]}
            fields={[
              { name: 'name', label: 'نام', required: true },
              { name: '_clothKind', label: 'نوع لباس', type: 'relation', options: kindOptions, required: true },
            ]}
          />
        </section>
        <section>
          <h3 className="mb-3 font-medium">نوع لباس</h3>
          <CrudPage
            resource="cloth-kind"
            title="نوع"
            rows={Array.isArray(kinds.data) ? kinds.data : []}
            columns={[{ header: 'نام', accessor: 'name' }]}
            fields={[{ name: 'name', label: 'نام', required: true }]}
          />
        </section>
      </div>
    </CountingShell>
  );
}
