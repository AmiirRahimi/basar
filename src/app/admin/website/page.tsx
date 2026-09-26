import { AccountingShell } from '@/components/accounting/AccountingShell';
import { WebsiteListingBoard, type WebsiteRequestRow, type WebsiteUserRow } from '@/components/accounting/WebsiteListingBoard';
import { getWebsiteListingBoard } from '@/actions/website';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function WebsiteListingPage() {
  const res = await getWebsiteListingBoard();
  guardSession(res);
  const data = (res.ok ? res.data : null) as { users?: WebsiteUserRow[]; requests?: WebsiteRequestRow[] } | null;
  return (
    <AccountingShell
      title="انتشار در وب‌سایت"
      description="کاربر را باز کنید تا فروش و برندهایش را ببینید، برند را باز کنید تا فروشگاه‌هایش را ببینید. اجازه درخواست انتشار را برای کاربر، برندهایش، یک برند، فروشگاه‌هایش یا یک فروشگاه بدهید."
      error={errorMessage(res)}
    >
      {data ? (
        <WebsiteListingBoard users={data.users || []} requests={data.requests || []} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </AccountingShell>
  );
}
