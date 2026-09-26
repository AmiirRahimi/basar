import Link from 'next/link';
import { AccountingShell } from '@/components/accounting/AccountingShell';
import { TeamInviteInbox } from '@/components/accounting/TeamInviteInbox';
import { getInviteByToken } from '@/actions/teams';
import { getSession } from '@/server/session';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, session] = await Promise.all([getInviteByToken(token), getSession()]);
  const loginHref = `/accounting/login?invite=${encodeURIComponent(token)}`;

  return (
    <AccountingShell title="دعوت به فروشگاه" description="دعوت ارسال‌شده برای پیوستن به فروشگاه یا برند">
      {!invite.ok || !invite.data ? (
        <p className="text-sm text-gray-600">{invite.message || 'دعوت پیدا نشد.'}</p>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-900">
              {invite.data.ownerName || 'صاحب فروشگاه'} شما را به{' '}
              {[...invite.data.storeNames, ...invite.data.brandNames].filter(Boolean).join(' · ') || 'فروشگاه خود'} دعوت
              کرده است
            </p>
            {invite.data.inviteLink ? (
              <p className="mt-2 break-all text-xs text-gray-500" dir="ltr">
                {invite.data.inviteLink}
              </p>
            ) : null}
            {session ? (
              <div className="mt-4">
                <TeamInviteInbox />
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-600">
                برای دیدن و پذیرش دعوت وارد شوید.{' '}
                <Link href={loginHref} className="font-medium underline">
                  ورود
                </Link>
              </p>
            )}
          </section>
        </div>
      )}
    </AccountingShell>
  );
}
