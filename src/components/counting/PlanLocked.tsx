import Link from 'next/link';

export function PlanLocked({
  title,
  what,
  planHint,
}: {
  title: string;
  what: string;
  planHint: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm leading-7 text-amber-950">
      <p className="text-base font-semibold">به این بخش دسترسی ندارید</p>
      <p className="mt-3">{what}</p>
      <p className="mt-3">
        برای استفاده از «{title}» باید اشتراک را مدیریت کنید و طرح {planHint} را فعال کنید.
      </p>
      <Link
        href="/counting/profile?tab=subscription"
        className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        مدیریت اشتراک
      </Link>
    </div>
  );
}
