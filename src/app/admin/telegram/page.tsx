import { AccountingShell } from '@/components/accounting/AccountingShell';
import { TelegramPublishBoard, type TelegramBoardData } from '@/components/accounting/TelegramPublishBoard';
import { getTelegramPublishBoard } from '@/actions/telegram';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function TelegramAdminPage() {
  const res = await getTelegramPublishBoard();
  guardSession(res);
  return (
    <AccountingShell
      title="تلگرام"
      description="انتشار لباس در کانال تلگرام، تاریخچه پست‌ها و دعوت اشخاص به کانال."
      error={errorMessage(res)}
    >
      {res.ok && res.data ? (
        <TelegramPublishBoard data={res.data as TelegramBoardData} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </AccountingShell>
  );
}
