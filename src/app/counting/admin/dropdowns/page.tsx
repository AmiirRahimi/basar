import { CountingShell } from '@/components/counting/CountingShell';
import { listClothKinds, listClothStyles, listColors, listSizes } from '@/actions/crud';
import { clothKindOptions } from '@/actions/options';
import { CrudPage } from '@/components/counting/CrudPage';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function DropdownsPage() {
  const [colors, sizes, kinds, styles, kindOptions] = await Promise.all([
    listColors(),
    listSizes(),
    listClothKinds(),
    listClothStyles(),
    clothKindOptions(),
  ]);
  guardSession(colors, sizes, kinds, styles);
  return (
    <CountingShell title="لیست‌های کمکی" error={errorMessage(kinds)}>
      <div className="grid gap-8">
        <CrudPage
          resource="cloth-kind"
          title="نوع"
          heading="نوع لباس"
          headingDescription="فقط از این صفحه قابل ویرایش است؛ مثلاً شلوار جین و شلوار کتان."
          headerAction="local"
          rows={Array.isArray(kinds.data) ? kinds.data : []}
          columns={[{ header: 'نام', accessor: 'name' }]}
          fields={[{ name: 'name', label: 'نام', required: true }]}
        />
        <CrudPage
          resource="cloth-style"
          title="مدل"
          heading="مدل لباس"
          headingDescription="مدل‌های هر نوع؛ مثلاً برای شلوار جین: شلوار راسته و شلوار مام."
          headerAction="local"
          rows={Array.isArray(styles.data) ? styles.data : []}
          columns={[
            { header: 'نام', accessor: 'name' },
            { header: 'نوع لباس', accessor: '_clothKind', format: 'name' },
          ]}
          fields={[
            { name: 'name', label: 'نام', required: true },
            { name: '_clothKind', label: 'نوع لباس', type: 'relation', options: kindOptions, required: true },
          ]}
        />
        <CrudPage
          resource="color"
          title="رنگ"
          heading="رنگ"
          headerAction="local"
          rows={Array.isArray(colors.data) ? colors.data : []}
          columns={[{ header: 'نام', accessor: 'name' }]}
          fields={[{ name: 'name', label: 'نام', required: true }]}
        />
        <CrudPage
          resource="size"
          title="سایز"
          heading="سایز"
          headerAction="local"
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
      </div>
    </CountingShell>
  );
}
