import { CountingShell } from '@/components/counting/CountingShell';
import { listClothKinds, listColors, listSizes } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function DropdownsPage() {
  const [colors, sizes, kinds] = await Promise.all([listColors(), listSizes(), listClothKinds()]);
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
            fields={[{ name: 'name', label: 'نام' }]}
          />
        </section>
        <section>
          <h3 className="mb-3 font-medium">سایز</h3>
          <CrudPage
            resource="size"
            title="سایز"
            rows={Array.isArray(sizes.data) ? sizes.data : []}
            columns={[{ header: 'نام', accessor: 'name' }]}
            fields={[{ name: 'name', label: 'نام' }]}
          />
        </section>
        <section>
          <h3 className="mb-3 font-medium">نوع لباس</h3>
          <CrudPage
            resource="cloth-kind"
            title="نوع"
            rows={Array.isArray(kinds.data) ? kinds.data : []}
            columns={[{ header: 'نام', accessor: 'name' }]}
            fields={[{ name: 'name', label: 'نام' }]}
          />
        </section>
      </div>
    </CountingShell>
  );
}
