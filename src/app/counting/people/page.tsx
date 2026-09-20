import { CountingShell } from '@/components/counting/CountingShell';
import { listPeople } from '@/actions/crud';
import { PeopleCrud } from '@/components/counting/PeopleCrud';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function PeoplePage() {
  const res = await listPeople();
  guardSession(res);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="اشخاص" error={errorMessage(res)}>
      <PeopleCrud rows={rows} />
    </CountingShell>
  );
}
