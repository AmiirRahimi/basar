import { CountingShell } from '@/components/counting/CountingShell';
import { listReturned } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function ReturnedPage() {
  const res = await listReturned();
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="برگشتی">
      <CrudPage
        resource="returned"
        title="برگشتی"
        rows={rows}
        columns={[
          { header: 'شخص', accessor: '_returnedPerson', format: 'name' },
          { header: 'تاریخ', accessor: 'timeStamp', format: 'date' },
        ]}
        fields={[{ name: '_returnedPerson', label: 'شناسه شخص' }]}
      />
    </CountingShell>
  );
}
