'use client';

import Link from 'next/link';
import { isHighestPlan, planById } from '@/lib/plans';
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
        href="/counting/profile?tab=subscription"
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
  const plan = planById(workspace.subscription?.planId);
  if (isHighestPlan(plan.id)) return null;
  const brands = workspace.brands?.length || 0;
  const stores = workspace.stores?.length || 0;
  const brandFull = brands >= plan.maxBrands;
  const storeFull = stores >= plan.maxStores;
  const detail = brandFull && storeFull
    ? 'ظرفیت برند و فروشگاه این طرح پر است.'
    : brandFull
      ? 'ظرفیت برند این طرح پر است.'
      : storeFull
        ? 'ظرفیت فروشگاه این طرح پر است.'
        : 'در طرح بالاتر می‌توانید حجره یا برند دیگری بسازید.';
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
      <p className="font-semibold">با ارتقای طرح، برند یا فروشگاه دیگری اضافه کنید</p>
      <p className="mt-1">
        طرح فعلی «{plan.name}» است: {plan.maxBrands >= 99 ? 'برند نامحدود' : `${plan.maxBrands} برند`} و{' '}
        {plan.maxStores >= 99 ? 'فروشگاه نامحدود' : `${plan.maxStores} فروشگاه`}. {detail}
      </p>
      <Link
        href="/counting/profile?tab=subscription"
        className="mt-3 inline-flex rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        ارتقای اشتراک
      </Link>
    </div>
  );
}

