import { CountingShell } from '@/components/counting/CountingShell';
import { listPeople } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';
import { PERSON_ROLES } from '@/lib/constants';

export default async function PeoplePage() {
  const res = await listPeople();
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="اشخاص">
      <CrudPage
        resource="person"
        title="شخص"
        rows={rows}
        columns={[
          { header: 'نام', accessor: 'fullName' },
          { header: 'موبایل', accessor: 'phoneNumber' },
          { header: 'نقش', accessor: 'role', format: 'role' },
          { header: 'اجرت دوخت', accessor: 'sewingFee', format: 'toman' },
          { header: 'آدرس', accessor: 'address' },
        ]}
        fields={[
          { name: 'fullName', label: 'نام' },
          { name: 'phoneNumber', label: 'موبایل' },
          { name: 'address', label: 'آدرس' },
          { name: 'city', label: 'شهر' },
          {
            name: 'role',
            label: 'نقش',
            type: 'select',
            options: Object.entries(PERSON_ROLES).map(([value, label]) => ({ value, label })),
          },
          {
            name: 'sewingFee',
            label: 'اجرت دوخت پارچه',
            type: 'number',
            required: true,
            visibleWhen: { field: 'role', values: ['2', '3'] },
          },
        ]}
      />
    </CountingShell>
  );
}
