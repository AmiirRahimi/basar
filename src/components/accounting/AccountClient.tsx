'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getPersonAccount } from '@/actions/crud';
import { FormCard, Select } from '@/ui';
import { displayName, faDate, faNumber, toman } from '@/lib/format';
import { personRoleLabel, personRolesLabel } from '@/lib/constants';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { paymentMethodCounts, personPaymentsHref } from '@/lib/payment-display';
import { PaymentForm } from './PaymentForm';
import { InvoiceSettleCard } from './PaymentRecordCard';
import { useWritable } from './useWritable';
import { checkAvailableForPayment, checkAvailableToTransfer, checkSerialLabel } from '@/lib/checks';
import type { FieldOption } from '@/lib/types';
import type { AccountInvoice, AccountPayment } from '@/lib/payment-display';

const ALL_INVOICES = 'all';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

type AccountItem = {
  _id: string;
  kind?: string;
  label: string;
  timeStamp?: string;
  total: number;
};

export function AccountClient({
  people,
  checks,
}: {
  people: any[];
  checks: any[];
}) {
  const router = useRouter();
  const writable = useWritable();
  const [person, setPerson] = useState('');
  const [invoiceId, setInvoiceId] = useState(ALL_INVOICES);
  const [account, setAccount] = useState<any>(null);
  const [pending, start] = useTransition();

  const payable = account?.kind === 'payable';
  const invoices: AccountInvoice[] = useMemo(() => {
    return [...(account?.invoices || [])].sort((a: AccountInvoice, b: AccountInvoice) => {
      const aOpen = Number(a.remaining || 0) > 0 ? 1 : 0;
      const bOpen = Number(b.remaining || 0) > 0 ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime();
    });
  }, [account?.invoices]);
  const items: AccountItem[] = account?.items || [];
  const selectedInvoice = invoices.find((row) => String(row._id) === invoiceId);
  const payTotal = selectedInvoice ? Number(selectedInvoice.total || 0) : Number(account?.purchaseTotal || 0);
  const payRemaining = selectedInvoice ? Number(selectedInvoice.remaining || 0) : Number(account?.remaining || 0);
  const payments: AccountPayment[] = Array.isArray(account?.payments) ? account.payments : [];
  const paymentCounts = useMemo(() => paymentMethodCounts(payments), [payments]);

  const checkOptions: FieldOption[] = checks
    .filter((row) => {
      if (!person) return false;
      if (payable) {
        if (row.isDeleted || row.isCashed || row.isReturned || row.isUsedInPayment) return false;
        if (checkAvailableToTransfer(row)) return true;
        return row.direction === 'out' && String(relation(row._owner)) === person;
      }
      return checkAvailableForPayment(row) && String(relation(row._owner)) === person;
    })
    .map((row) => {
      const serial = checkSerialLabel(row);
      return {
        value: String(row._id),
        label: `${toman(row.amount)} — ${row.dueDate || ''}${serial ? ` — ${serial}` : ''}`,
        price: Number(row.amount || 0),
      };
    });

  const invoiceOptions = useMemo<FieldOption[]>(() => {
    const allLabel = `همه فاکتورها — باید بپردازد ${toman(account?.remaining)}`;
    return [
      { value: ALL_INVOICES, label: allLabel },
      ...invoices.map((row) => ({
        value: String(row._id),
        label: `فاکتور ${row.invoiceNumber || '—'} — ${faDate(row.timeStamp)} — مانده ${toman(row.remaining)}`,
      })),
    ];
  }, [account?.remaining, invoices]);

  function relation(value: unknown) {
    if (value && typeof value === 'object' && '_id' in value) return String((value as { _id: unknown })._id);
    return String(value || '');
  }

  function load(id: string) {
    start(async () => {
      const res = await getPersonAccount(id);
      if (redirectIfUnauthorized(res)) return;
      setAccount(res.ok ? res.data : null);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FormCard>
        <Select
          label="شخص"
          options={people.map((p) => ({
            label: [p.fullName, personRolesLabel(p.role) || personRoleLabel(p.role)].filter(Boolean).join(' — '),
            value: p._id,
          }))}
          value={person}
          searchable
          placeholder="انتخاب کنید"
          labels={selectLabels}
          onChange={(v) => {
            const id = String(v);
            setPerson(id);
            setInvoiceId(ALL_INVOICES);
            setAccount(null);
            load(id);
          }}
        />
        {account ? (
          <div className="mt-4 grid gap-2 rounded-xl bg-gray-50 p-3 text-sm">
            {payable ? (
              <>
                <p>نقش: {account.roleLabel || personRoleLabel(account.person?.role)}</p>
                <p>جمع بدهی به این شخص: {toman(account.owedTotal ?? account.purchaseTotal)}</p>
                <p>پرداخت‌شده: {toman(account.paidTotal)}</p>
                <p className="text-base font-semibold">باید بپردازید: {toman(account.remaining)}</p>
                <p className="text-xs text-gray-500">این مبلغ از خرید پارچه یا اجرت لباس‌ها منهای پرداخت‌های شماست.</p>
              </>
            ) : (
              <>
                <p>جمع فاکتورها: {toman(account.purchaseTotal)}</p>
                <p>جمع پرداخت‌ها (نقد، چک، تخفیف): {toman(account.paidTotal)}</p>
                {Number(account.returnTotal || 0) > 0 ? (
                  <p>برگشتی (بستانکار مشتری): {toman(account.returnTotal)}</p>
                ) : null}
                {Number(account.creditToCustomer || 0) > 0 ? (
                  <>
                    <p className="text-base font-semibold">شما به این مشتری بدهکارید: {toman(account.creditToCustomer)}</p>
                    <p className="text-xs text-gray-500">مبلغ برگشتی از بدهی فاکتورها بیشتر است.</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold">باید بپردازد: {toman(account.remaining)}</p>
                    {selectedInvoice ? (
                      <p className="text-gray-600">
                        مانده فاکتور {selectedInvoice.invoiceNumber || '—'}: {toman(selectedInvoice.remaining)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">این مبلغ برابر جمع فاکتورها منهای پرداخت‌ها و برگشتی‌هاست.</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ) : null}
        {person && !payable ? (
          <div className="mt-4">
            <Select
              label="فاکتور (اختیاری)"
              value={invoiceId}
              onChange={(v) => setInvoiceId(String(v || ALL_INVOICES))}
              options={invoiceOptions}
              searchable
              placeholder="همه فاکتورها"
              labels={selectLabels}
            />
            <p className="mt-1 text-xs text-gray-500">پیش‌فرض مانده کل است. اگر بخواهید، یک فاکتور را برای همین پرداخت انتخاب کنید.</p>
          </div>
        ) : null}
        {writable ? (
          <div className="mt-4">
            <PaymentForm
              personId={person}
              invoiceId={payable || invoiceId === ALL_INVOICES ? undefined : invoiceId}
              total={payTotal}
              remaining={payRemaining}
              checks={checkOptions}
              payable={payable}
              onSaved={() => {
                if (person) load(person);
                router.refresh();
              }}
            />
          </div>
        ) : null}
      </FormCard>
      <FormCard>
        {person ? (
          <Link
            href={personPaymentsHref(person)}
            className="mb-6 block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-teal-300 hover:bg-teal-50/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-gray-900">گردش پرداخت</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {faNumber(paymentCounts.paymentCount)} پرداخت ثبت شده
                  {paymentCounts.cashCount ? ` · ${faNumber(paymentCounts.cashCount)} نقد` : ''}
                  {paymentCounts.checkCount ? ` · ${faNumber(paymentCounts.checkCount)} چک` : ''}
                </p>
              </div>
              <ChevronLeft className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <dt className="text-[11px] text-gray-500">پرداخت‌شده</dt>
                <dd className="text-sm font-semibold">{toman(account?.paidTotal ?? paymentCounts.paidTotal)}</dd>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <dt className="text-[11px] text-gray-500">
                  {payable ? 'باید بپردازید' : Number(account?.creditToCustomer || 0) > 0 ? 'بستانکار مشتری' : 'باید بپردازد'}
                </dt>
                <dd className="text-sm font-semibold">
                  {toman(Number(account?.creditToCustomer || 0) > 0 ? account?.creditToCustomer : account?.remaining)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-teal-800">مشاهده پرداخت‌ها روی فاکتورها</p>
          </Link>
        ) : (
          <div className="mb-6">
            <h3 className="mb-1 font-medium">گردش پرداخت</h3>
            <p className="text-sm text-gray-500">ابتدا یک شخص را انتخاب کنید.</p>
          </div>
        )}
        <h3 className="mb-1 font-medium">{payable ? 'اقلام بدهی' : 'فاکتورها'}</h3>
        {!payable && person ? (
          <p className="mb-3 text-xs text-gray-500">فاکتور را برای پرداخت انتخاب کنید. مانده همان مبلغی است که باید بپردازد.</p>
        ) : (
          <div className="mb-3" />
        )}
        {pending ? <p className="text-sm text-gray-500">در حال بارگذاری...</p> : null}
        {payable ? (
          <ul className="space-y-2 text-sm">
            {items.map((row) => (
              <li key={row._id} className="flex justify-between gap-2 border-b py-2">
                <span>
                  {row.label}
                  <span className="mt-0.5 block text-xs text-gray-500">{faDate(row.timeStamp)}</span>
                </span>
                <span className="shrink-0 font-medium">{toman(row.total)}</span>
              </li>
            ))}
          </ul>
        ) : person ? (
          <ul className="space-y-3">
            {invoices.map((row) => (
              <li key={row._id}>
                <InvoiceSettleCard
                  row={row}
                  selected={String(row._id) === invoiceId}
                  href={personPaymentsHref(person, String(row._id))}
                  onSelect={() => setInvoiceId(String(row._id))}
                />
              </li>
            ))}
            {!invoices.length && !pending ? (
              <li className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                فاکتوری برای این شخص نیست.
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">ابتدا یک شخص را انتخاب کنید.</p>
        )}
        {person && !invoices.length && !items.length && !payments.length ? (
          <p className="mt-4 text-sm text-gray-500">گردشی برای {displayName(account?.person)} نیست</p>
        ) : null}
      </FormCard>
    </div>
  );
}
