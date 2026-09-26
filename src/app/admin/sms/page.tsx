import { AccountingShell } from '@/components/accounting/AccountingShell';
import { SmsSendBoard, type SmsBoardData } from '@/components/accounting/SmsSendBoard';
import { getSmsBoard } from '@/actions/sms';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function AdminSmsPage() {
  const res = await getSmsBoard();
  guardSession(res);
  return (
    <AccountingShell
      title="پیامک"
      description="ارسال گروهی پیامک به مشتریان عمده، مانده‌حساب‌ها و کاربران. OTP و پیام خوش‌آمد جداگانه از SMS.ir ارسال می‌شود."
      error={errorMessage(res)}
    >
      {res.ok && res.data ? (
        <SmsSendBoard data={res.data as SmsBoardData} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </AccountingShell>
  );
}
