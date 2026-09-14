import { CountingShell } from '@/components/counting/CountingShell';
import { listPeople } from '@/actions/crud';
import { AccountClient } from '@/components/counting/AccountClient';

export default async function AccountPage() {
  const people = await listPeople();
  return (
    <CountingShell title="حساب" description="پرداخت‌ها و تسویه مشتری">
      <AccountClient people={Array.isArray(people.data) ? people.data : []} />
    </CountingShell>
  );
}
