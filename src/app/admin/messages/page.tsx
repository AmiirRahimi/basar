import { AccountingShell } from '@/components/accounting/AccountingShell';
import { ChatInbox } from '@/components/chat/ChatInbox';
import { listAdminConversations } from '@/actions/chat';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { ChatConversationDto } from '@/lib/chat-types';

export default async function AdminMessagesPage() {
  const res = await listAdminConversations('all');
  guardSession(res);
  const conversations = (res.ok && res.data?.conversations ? res.data.conversations : []) as ChatConversationDto[];
  const unread = res.ok && res.data ? res.data.unread : 0;

  return (
    <AccountingShell
      title="پیام‌ها"
      description="گفتگوهای پشتیبانی کاربران حسابداری و مشتریان فروشگاه. از اینجا پاسخ دهید."
      error={errorMessage(res)}
    >
      {res.ok ? (
        <ChatInbox initialConversations={conversations} initialUnread={unread} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </AccountingShell>
  );
}
