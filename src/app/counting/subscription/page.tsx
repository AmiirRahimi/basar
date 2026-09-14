import { CountingShell } from '@/components/counting/CountingShell';
import { getSessionUser } from '@/actions/auth';
import { SubscriptionForm } from '@/components/counting/SubscriptionForm';

export default async function SubscriptionPage() {
  const user = await getSessionUser();
  const days = (user.data as any)?.remainingDaysOfSubscription;
  return (
    <CountingShell title="اشتراک">
      <p className="mb-4 text-sm text-muted-foreground">روز باقیمانده: {days ?? 'نامشخص'}</p>
      <SubscriptionForm />
    </CountingShell>
  );
}
