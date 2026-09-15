import { CountingShell } from '@/components/counting/CountingShell';
import { listPeople } from '@/actions/crud';
import { AccountClient } from '@/components/counting/AccountClient';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function AccountPage() {
  const people = await listPeople();
  guardSession(people);
  return (
    <CountingShell
      title="حساب"
      description="پرداخت‌ها و تسویه مشتری"
      error={errorMessage(people)}
    >
      <AccountClient people={Array.isArray(people.data) ? people.data : []} />
    </CountingShell>
  );
}
