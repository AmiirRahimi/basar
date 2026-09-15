import { CountingShell } from '@/components/counting/CountingShell';
import { listPeople } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';
import { PERSON_ROLES } from '@/lib/constants';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function PeoplePage() {
  const res = await listPeople();
  guardSession(res);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="اشخاص" error={errorMessage(res)}>
      <CrudPage
        resource="person"
        title="شخص"
        rows={rows}
        columns={[
          { header: 'نام', accessor: 'fullName' },
          { header: 'موبایل', accessor: 'phoneNumber' },
          { header: 'نقش', accessor: 'role', format: 'role' },
          { header: 'شهر', accessor: 'city' },
          { header: 'آدرس', accessor: 'address' },
        ]}
        fields={[
          { name: 'fullName', label: 'نام' },
          { name: 'phoneNumber', label: 'موبایل' },
          { name: 'address', label: 'آدرس' },
          {
            name: 'city',
            label: 'شهر',
            type: 'select',
            searchable: true,
            options: IRAN_CITY_OPTIONS,
          },
          {
            name: 'role',
            label: 'نقش',
            type: 'select',
            options: Object.entries(PERSON_ROLES).map(([value, label]) => ({ value, label })),
          },
        ]}
      />
    </CountingShell>
  );
}
