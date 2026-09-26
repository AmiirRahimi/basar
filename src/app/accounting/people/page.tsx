import { AccountingShell } from '@/components/accounting/AccountingShell';
import { listPeople } from '@/actions/crud';
import { PeopleCrud } from '@/components/accounting/PeopleCrud';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function PeoplePage() {
  const res = await listPeople();
  guardSession(res);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <AccountingShell title="اشخاص" error={errorMessage(res)}>
      <PeopleCrud rows={rows} />
    </AccountingShell>
  );
}
