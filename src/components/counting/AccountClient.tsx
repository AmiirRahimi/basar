'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getPersonAccount } from '@/actions/crud';
import { FormCard, Select } from '@/ui';
import { displayName, faDate, toman } from '@/lib/format';
import { personRoleLabel } from '@/lib/constants';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { PaymentForm } from './PaymentForm';
import { checkAvailableForPayment, checkAvailableToTransfer } from '@/lib/checks';
import type { FieldOption } from '@/lib/types';

const ALL_INVOICES = 'all';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

type AccountInvoice = {
  _id: string;
  invoiceNumber?: string | number;
  timeStamp?: string;
  total: number;
  paid: number;
  remaining: number;
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
  const [person, setPerson] = useState('');
  const [invoiceId, setInvoiceId] = useState(ALL_INVOICES);
  const [account, setAccount] = useState<any>(null);
  const [pending, start] = useTransition();

  const payable = account?.kind === 'payable';
  const invoices: AccountInvoice[] = account?.invoices || [];
  const items: AccountItem[] = account?.items || [];
  const selectedInvoice = invoices.find((row) => String(row._id) === invoiceId);
  const payTotal = selectedInvoice ? Number(selectedInvoice.total || 0) : Number(account?.purchaseTotal || 0);
  const payRemaining = selectedInvoice ? Number(selectedInvoice.remaining || 0) : Number(account?.remaining || 0);

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
    .map((row) => ({
      value: String(row._id),
      label: `${toman(row.amount)} — ${row.dueDate || ''}${row.serialNumber ? ` — ${row.serialNumber}` : ''}`,
      price: Number(row.amount || 0),
    }));

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
            label: [p.fullName, personRoleLabel(p.role)].filter(Boolean).join(' — '),
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
                <p className="text-base font-semibold">باید بپردازد: {toman(account.remaining)}</p>
                {selectedInvoice ? (
                  <p className="text-gray-600">
                    مانده فاکتور {selectedInvoice.invoiceNumber || '—'}: {toman(selectedInvoice.remaining)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">این مبلغ برابر جمع فاکتورها منهای جمع پرداخت‌های همین شخص است.</p>
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
      </FormCard>
      <FormCard>
        <h3 className="mb-3 font-medium">{payable ? 'اقلام بدهی' : 'فاکتورها'}</h3>
        {pending ? <p className="text-sm text-gray-500">در حال بارگذاری...</p> : null}
        {payable ? (
          <ul className="mb-6 space-y-2 text-sm">
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
        ) : (
          <ul className="mb-6 space-y-2 text-sm">
            {invoices.map((row) => (
              <li key={row._id} className="border-b py-2">
                <button type="button" className="w-full text-right" onClick={() => setInvoiceId(String(row._id))}>
                  <div className="flex justify-between">
                    <span>فاکتور {row.invoiceNumber || row._id}</span>
                    <span>{toman(row.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>{faDate(row.timeStamp)}</span>
                    <span>مانده {toman(row.remaining)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <h3 className="mb-3 font-medium">گردش پرداخت</h3>
        <ul className="space-y-2 text-sm">
          {(account?.payments || []).map((row: any) => (
            <li key={row._id} className="flex justify-between gap-2 border-b py-2">
              <span>
                {Number(row.cashAmount || row.cash || 0) ? `نقد ${toman(row.cashAmount || row.cash)}` : ''}
                {Number(row.checkAmount || 0) ? ` چک ${toman(row.checkAmount)}` : ''}
                {Number(row.discount || 0) ? ` تخفیف ${toman(row.discount)}` : ''}
                {Number(row.creditAmount || 0) ? ` نسیه ${toman(row.creditAmount)}` : ''}
                {!Number(row.cashAmount || row.cash || 0) &&
                !Number(row.checkAmount || 0) &&
                !Number(row.discount || 0) &&
                !Number(row.creditAmount || 0)
                  ? 'پرداخت'
                  : ''}
                <span className="mt-0.5 block text-xs text-gray-500">
                  {row._invoice
                    ? `فاکتور ${row._invoice.invoiceNumber || displayName(row._invoice)}`
                    : payable
                      ? 'روی مانده بدهی'
                      : 'روی مانده کل فاکتورها'}
                </span>
              </span>
              <span className="shrink-0">{faDate(row.timeStamp)}</span>
            </li>
          ))}
        </ul>
        {person && !invoices.length && !items.length && !account?.payments?.length ? (
          <p className="text-sm text-gray-500">گردشی برای {displayName(account?.person)} نیست</p>
        ) : null}
      </FormCard>
    </div>
  );
}
