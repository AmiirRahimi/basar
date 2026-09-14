import { CountingShell } from '@/components/counting/CountingShell';
import { listChecks } from '@/actions/crud';
import { personOptions } from '@/actions/options';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function ChecksPage() {
  const [res, people] = await Promise.all([listChecks(), personOptions()]);
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
          { name: '_owner', label: 'صاحب چک', type: 'relation', options: people, required: true },
          { name: 'amount', label: 'مبلغ', type: 'number', required: true },
          { name: 'dueDate', label: 'سررسید (مثلاً 1403/01/15)', required: true },
          { name: 'serialNumber', label: 'سریال', type: 'number', required: true },
          { name: 'sayadiNumber', label: 'صیادی', type: 'number', required: true },
        ]}
      />
    </CountingShell>
  );
}
