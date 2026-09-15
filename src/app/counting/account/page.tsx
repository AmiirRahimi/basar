import { CountingShell } from '@/components/counting/CountingShell';
import { listChecks, listPeople } from '@/actions/crud';
import { AccountClient } from '@/components/counting/AccountClient';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function AccountPage() {
  const [people, checks] = await Promise.all([listPeople(), listChecks(1, 200)]);
  guardSession(people, checks);
  return (
    <CountingShell title="حساب" description="مشتری باید بپردازد؛ خیاط، بنکدار، فروشنده و شست‌وشو را شما می‌پردازید" error={errorMessage(people)}>
      <AccountClient
        people={Array.isArray(people.data) ? people.data : []}
        checks={Array.isArray(checks.data) ? checks.data : []}
      />
    </CountingShell>
  );
}
