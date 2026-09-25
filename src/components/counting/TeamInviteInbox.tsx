'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { respondToTeamInvite } from '@/actions/teams';
import { permissionLabel } from '@/lib/permissions';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';

export function TeamInviteInbox() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [pending, start] = useTransition();
  const invites = workspace?.pendingInvites || [];
  if (!invites.length) return null;

  function respond(id: string, accept: boolean) {
    start(async () => {
      const res = await respondToTeamInvite(id, accept);
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || (accept ? 'پذیرفته شد' : 'رد شد'));
        router.refresh();
      } else {
        toast.error(res.message || 'انجام نشد');
      }
    });
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-amber-950">
        <Mail className="h-4 w-4" />
        <h3 className="text-sm font-semibold">دعوت به فروشگاه</h3>
      </div>
      <div className="space-y-3">
        {invites.map((invite) => {
          const places = [...invite.storeNames, ...invite.brandNames].filter(Boolean);
          return (
            <div key={invite._id} className="rounded-xl border border-amber-100 bg-white px-3 py-3">
              <p className="text-sm font-medium text-gray-900">
                {invite.ownerName || 'صاحب فروشگاه'} شما را به {places.length ? places.join(' · ') : 'فروشگاه خود'} دعوت
                کرده است
              </p>
              {invite.inviteLink ? (
                <p className="mt-1 break-all text-[11px] text-gray-500" dir="ltr">
                  {invite.inviteLink}
                </p>
              ) : null}
              <p className="mt-2 text-[11px] leading-5 text-gray-500">
                دسترسی‌ها: {invite.permissions.map(permissionLabel).join('، ')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={pending} onClick={() => respond(invite._id, true)}>
                  پذیرش
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => respond(invite._id, false)}>
                  رد دعوت
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
