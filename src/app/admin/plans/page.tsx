import { CountingShell } from '@/components/counting/CountingShell';
import { PlanCatalogEditor } from '@/components/counting/PlanCatalogEditor';
import { getPlanCatalog } from '@/actions/admin';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import type { SubscriptionPlan } from '@/lib/plans';

export default async function AdminPlansPage() {
  const res = await getPlanCatalog();
  guardSession(res);
  return (
    <CountingShell
      title="طرح‌های اشتراک"
      description="نام، قیمت، امکانات و تخفیف سالانه را ویرایش کنید. اگر هنوز چیزی ذخیره نکرده‌اید، همان مقادیر فعلی به‌عنوان پیش‌فرض آمده‌اند."
      error={errorMessage(res)}
    >
      {res.ok && res.data ? (
        <PlanCatalogEditor initial={res.data as { annualDiscount: number; plans: SubscriptionPlan[] }} />
      ) : (
        <p className="text-sm text-muted-foreground">{res.message || 'به این بخش دسترسی ندارید.'}</p>
      )}
    </CountingShell>
  );
}
