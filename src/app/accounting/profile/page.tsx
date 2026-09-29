import { redirect } from 'next/navigation';
import { AccountingShell } from '@/components/accounting/AccountingShell';
import { ProfileSettings } from '@/components/accounting/ProfileSettings';
import { getSessionUser } from '@/actions/auth';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, user] = await Promise.all([searchParams, getSessionUser()]);
  if (tab === 'workspace' || tab === 'teams' || tab === 'partners') {
    redirect(`/accounting/workspace?tab=${tab}`);
  }
  guardSession(user);
  return (
    <AccountingShell title="پروفایل" error={errorMessage(user)}>
      <ProfileSettings user={(user.data || {}) as any} initialTab={tab} />
    </AccountingShell>
  );
}
