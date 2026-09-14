import { CountingShell } from '@/components/counting/CountingShell';
import { listChanges } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';
import { faDate } from '@/lib/format';

export default async function ChangePage() {
  const res = await listChanges();
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="تغییرات">
      <CrudPage
        resource="change"
        title="تغییر"
        rows={rows}
        columns={[
          { header: 'توضیح', accessor: 'description' },
          { header: 'تاریخ', accessor: 'timeStamp', cell: (r) => faDate(r.timeStamp) },
        ]}
        fields={[{ name: 'description', label: 'توضیح' }]}
      />
    </CountingShell>
  );
}
