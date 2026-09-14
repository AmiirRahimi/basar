import { CountingShell } from '@/components/counting/CountingShell';
import { listChecks } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function ChecksPage() {
  const res = await listChecks();
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="چک">
      <CrudPage
        resource="check"
        title="چک"
        rows={rows}
        columns={[
          { header: 'صاحب', accessor: '_owner', format: 'name' },
          { header: 'مبلغ', accessor: 'amount', format: 'toman' },
          { header: 'سررسید', accessor: 'dueDate' },
          { header: 'صیادی', accessor: 'sayadiNumber' },
        ]}
        fields={[
          { name: '_owner', label: 'شناسه صاحب چک' },
          { name: 'amount', label: 'مبلغ', type: 'number' },
          { name: 'dueDate', label: 'سررسید (مثلاً 1403/01/15)' },
          { name: 'serialNumber', label: 'سریال', type: 'number' },
          { name: 'sayadiNumber', label: 'صیادی', type: 'number' },
        ]}
      />
    </CountingShell>
  );
}
