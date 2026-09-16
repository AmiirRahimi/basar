'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { activateSubscription } from '@/actions/auth';
import {
  ANNUAL_DISCOUNT,
  SUBSCRIPTION_PLANS,
  cycleLabel,
  planPrice,
  type BillingCycle,
} from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { Workspace } from '@/lib/types';
import { Button, Input, toast } from '@/ui';

export function SubscriptionPanel({
  subscription,
  purchases = [],
}: {
  subscription?: Workspace['subscription'] & { active?: boolean };
  purchases?: Workspace['purchases'];
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>('month');
  const [discountCode, setDiscountCode] = useState('');
  const [pending, start] = useTransition();
  const remainingDays = Number(subscription?.remainingDays || 0);
  const active = Boolean(subscription?.active ?? remainingDays > 0);

  const history = useMemo(() => purchases || [], [purchases]);

  function buy(planId: string) {
    start(async () => {
      const res = await activateSubscription({
        planId,
        billingCycle: cycle,
        discountCode: discountCode.trim(),
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'اشتراک فعال شد');
        router.refresh();
      } else {
        toast.error(res.message || 'خرید انجام نشد');
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {active ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">اشتراک فعال</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {subscription?.planName} · {cycleLabel(subscription?.billingCycle)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {faNumber(remainingDays)} روز باقی مانده
                {subscription?.endDate ? ` · تا ${faDate(subscription.endDate)}` : ''}
              </p>
            </div>
            <p className="text-sm text-teal-800">می‌توانید قبل از پایان، طرح را تمدید یا ارتقا دهید.</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold text-gray-900">اشتراکی ندارید یا به پایان رسیده</p>
            <p className="mt-1 text-sm text-gray-600">
              برای ثبت فاکتور، لباس و فروشگاه باید یکی از طرح‌ها را بخرید. الان فقط مشاهده جدول‌ها ممکن است.
            </p>
          </div>
        )}
      </section>

      {history.length ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">خریدهای قبلی</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {history.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {row.planName} · {cycleLabel(row.billingCycle)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {faDate(row.startDate)} تا {faDate(row.endDate)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-medium">{toman(row.price)}</p>
                  <p className={`text-xs ${row.active ? 'text-teal-700' : 'text-gray-400'}`}>
                    {row.active ? 'فعال' : 'تمام‌شده'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{active ? 'تمدید یا ارتقا' : 'خرید اشتراک'}</h3>
              <p className="text-xs text-gray-500">ماهانه از {toman(100_000)}. سالانه {faNumber(ANNUAL_DISCOUNT * 100)}٪ تخفیف دارد.</p>
            </div>
            <div className="flex rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setCycle('month')}
                className={`rounded-lg px-3 py-1.5 text-sm ${cycle === 'month' ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}
              >
                ماهانه
              </button>
              <button
                type="button"
                onClick={() => setCycle('year')}
                className={`rounded-lg px-3 py-1.5 text-sm ${cycle === 'year' ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}
              >
                سالانه
              </button>
            </div>
          </div>
          <div className="max-w-sm">
            <Input
              label="کد تخفیف (اختیاری)"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const price = planPrice(plan, cycle);
              const yearlyFull = plan.monthlyPrice * 12;
              return (
                <article
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${
                    plan.highlight ? 'border-teal-600 ring-1 ring-teal-600' : 'border-gray-200'
                  }`}
                >
                  {plan.highlight ? (
                    <span className="mb-2 w-fit rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                      پیشنهادی
                    </span>
                  ) : null}
                  <h4 className="text-base font-semibold text-gray-900">{plan.name}</h4>
                  <p className="mt-1 min-h-10 text-xs text-gray-500">{plan.blurb}</p>
                  <p className="mt-3 text-2xl font-semibold text-gray-900">{toman(price)}</p>
                  <p className="text-xs text-gray-500">{cycle === 'year' ? 'برای یک سال' : 'برای هر ماه'}</p>
                  {cycle === 'year' ? (
                    <p className="mt-1 text-xs text-teal-700">
                      به‌جای {toman(yearlyFull)} — {faNumber(ANNUAL_DISCOUNT * 100)}٪ تخفیف
                    </p>
                  ) : null}
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature.label} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                        ) : (
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                        )}
                        <span className={feature.included ? 'text-gray-800' : 'text-gray-400'}>{feature.label}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-4 w-full" disabled={pending} onClick={() => buy(plan.id)}>
                    {active ? 'تمدید این طرح' : 'خرید'}
                  </Button>
                </article>
              );
            })}
          </div>
        </section>
    </div>
  );
}
