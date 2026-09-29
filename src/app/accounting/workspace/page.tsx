import { AccountingShell } from '@/components/accounting/AccountingShell';
import { PlaceBoard } from '@/components/accounting/PlaceBoard';
import { getSessionUser } from '@/actions/auth';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, user] = await Promise.all([searchParams, getSessionUser()]);
  guardSession(user);
  return (
    <AccountingShell title="حجره" description="برند، فروشگاه، اعضا، شرکا و انبار" error={errorMessage(user)}>
      <PlaceBoard initialTab={tab} />
    </AccountingShell>
  );
}
