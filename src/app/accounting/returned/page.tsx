import { AccountingShell } from '@/components/accounting/AccountingShell';
import { ReturnedClient } from '@/components/accounting/ReturnedClient';
import { personOptions } from '@/actions/options';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { listPeople } from '@/actions/crud';

export default async function ReturnedPage() {
  const [people, peopleRes] = await Promise.all([personOptions('1'), listPeople()]);
  guardSession(peopleRes);
  return (
    <AccountingShell
      title="برگشتی"
      description="لباس خریده‌شده را انتخاب کنید و با قیمت خرید یا قیمت دیگر دریافت کنید؛ مبلغ به حساب مشتری بستانکار می‌شود"
      error={errorMessage(peopleRes)}
    >
      <ReturnedClient people={people} />
    </AccountingShell>
  );
}
