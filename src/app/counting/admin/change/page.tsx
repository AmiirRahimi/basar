import { CountingShell } from '@/components/counting/CountingShell';
import { listChanges } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function ChangePage() {
  const res = await listChanges();
  guardSession(res);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="تغییرات" error={errorMessage(res)}>
      <CrudPage
        resource="change"
        title="تغییر"
        rows={rows}
        columns={[
          { header: 'توضیح', accessor: 'description' },
          { header: 'تاریخ', accessor: 'timeStamp', format: 'date' },
        ]}
        fields={[{ name: 'description', label: 'توضیح' }]}
      />
    </CountingShell>
  );
}
