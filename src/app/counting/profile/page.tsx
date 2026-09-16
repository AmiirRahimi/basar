import { CountingShell } from '@/components/counting/CountingShell';
import { ProfileSettings } from '@/components/counting/ProfileSettings';
import { getSessionUser } from '@/actions/auth';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, user] = await Promise.all([searchParams, getSessionUser()]);
  guardSession(user);
  return (
    <CountingShell title="تنظیمات" description="حساب، برند، فروشگاه و شرکا را از همین صفحه مدیریت کنید." error={errorMessage(user)}>
      <ProfileSettings user={(user.data || {}) as any} initialTab={tab} />
    </CountingShell>
  );
}
