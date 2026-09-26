'use client';

import Link from 'next/link';
import { isHighestPlan } from '@/lib/plans';
import { useWorkspace } from './WorkspaceProvider';

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
        href="/accounting/profile?tab=subscription"
        className="mt-4 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        مدیریت اشتراک
      </Link>
    </div>
  );
}

export function PlanCapacityBanner() {
  const workspace = useWorkspace();
  if (!workspace || workspace.isPlatformAdmin) return null;
  const planId = workspace.subscription?.planId;
  if (isHighestPlan(planId)) return null;
  const brands = workspace.brands?.length || 0;
  const stores = workspace.stores?.length || 0;
  const maxBrands = workspace.subscription?.maxBrands ?? 1;
  const maxStores = workspace.subscription?.maxStores ?? 1;
  const brandFull = brands >= maxBrands;
  const storeFull = stores >= maxStores;
  const detail = brandFull && storeFull
    ? 'ظرفیت برند و فروشگاه این طرح پر است.'
    : brandFull
      ? 'ظرفیت برند این طرح پر است.'
      : storeFull
        ? 'ظرفیت فروشگاه این طرح پر است.'
        : 'در طرح بالاتر می‌توانید حجره یا برند دیگری بسازید.';
  const planName = workspace.subscription?.planName || 'فعلی';
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
      <p className="font-semibold">با ارتقای طرح، برند یا فروشگاه دیگری اضافه کنید</p>
      <p className="mt-1">
        طرح فعلی «{planName}» است: {maxBrands >= 99 ? 'برند نامحدود' : `${maxBrands} برند`} و{' '}
        {maxStores >= 99 ? 'فروشگاه نامحدود' : `${maxStores} فروشگاه`}. {detail}
      </p>
      <Link
        href="/accounting/profile?tab=subscription"
        className="mt-3 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        ارتقای اشتراک
      </Link>
    </div>
  );
}

