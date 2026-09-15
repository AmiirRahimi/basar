import { CountingShell } from '@/components/counting/CountingShell';
import { getSessionUser } from '@/actions/auth';
import { SubscriptionForm } from '@/components/counting/SubscriptionForm';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function SubscriptionPage() {
  const user = await getSessionUser();
  guardSession(user);
  const days = (user.data as any)?.remainingDaysOfSubscription;
  return (
    <CountingShell title="اشتراک" error={errorMessage(user)}>
      <p className="mb-4 text-sm text-muted-foreground">روز باقیمانده: {days ?? 'نامشخص'}</p>
      <SubscriptionForm />
    </CountingShell>
  );
}
