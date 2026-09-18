'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { getPersonAccount } from '@/actions/crud';
import { FormCard, Select } from '@/ui';
import { displayName, faDate, toman } from '@/lib/format';
import { personRoleLabel } from '@/lib/constants';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { PaymentForm } from './PaymentForm';
import { useWritable } from './useWritable';
import {
  checkAvailableForPayment,
  checkAvailableToTransfer,
  paymentApplied,
} from '@/lib/checks';
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

type PaymentPart = {
  key: string;
  label: string;
  amount: number;
  className: string;
};

function paymentParts(row: {
  cash?: number;
  cashAmount?: number;
  checkAmount?: number;
  discount?: number;
  creditAmount?: number;
}): PaymentPart[] {
  const cash = Number(row.cashAmount ?? row.cash ?? 0);
  const check = Number(row.checkAmount || 0);
  const discount = Number(row.discount || 0);
  const credit = Number(row.creditAmount || 0);
  return [
    cash > 0 ? { key: 'cash', label: 'نقد', amount: cash, className: 'bg-emerald-50 text-emerald-900' } : null,
    check > 0 ? { key: 'check', label: 'چک', amount: check, className: 'bg-sky-50 text-sky-900' } : null,
    discount > 0 ? { key: 'discount', label: 'تخفیف', amount: discount, className: 'bg-amber-50 text-amber-950' } : null,
    credit > 0 ? { key: 'credit', label: 'نسیه دفتر', amount: credit, className: 'bg-gray-100 text-gray-700' } : null,
  ].filter(Boolean) as PaymentPart[];
}

function paymentTarget(row: { _invoice?: { invoiceNumber?: string | number } | string }, payable: boolean) {
  if (row._invoice) {
    const number =
      typeof row._invoice === 'object' ? row._invoice.invoiceNumber || displayName(row._invoice) : displayName(row._invoice);
    return `فاکتور ${number}`;
  }
  return payable ? 'مانده بدهی این شخص' : 'مانده کل فاکتورها';
}

function checkNote(row: { _check?: { serialNumber?: number; dueDate?: string; amount?: number } | string }) {
  const check = row._check && typeof row._check === 'object' ? row._check : null;
  if (!check) return '';
  return [
    check.serialNumber ? `شماره ${check.serialNumber}` : '',
    check.dueDate ? `سررسید ${check.dueDate}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

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
  const invoices: AccountInvoice[] = account?.invoices || [];
  const items: AccountItem[] = account?.items || [];
  const selectedInvoice = invoices.find((row) => String(row._id) === invoiceId);
  const payTotal = selectedInvoice ? Number(selectedInvoice.total || 0) : Number(account?.purchaseTotal || 0);
  const payRemaining = selectedInvoice ? Number(selectedInvoice.remaining || 0) : Number(account?.remaining || 0);
  const payments = useMemo(() => {
    const rows = Array.isArray(account?.payments) ? [...account.payments] : [];
    const filtered =
      selectedInvoice
        ? rows.filter((row: { _invoice?: { _id?: unknown } | string }) => {
            const invoice = row._invoice;
            const id =
              invoice && typeof invoice === 'object' && '_id' in invoice
                ? String(invoice._id)
                : String(invoice || '');
            return id === String(selectedInvoice._id);
          })
        : rows;
    return filtered.sort((a: { timeStamp?: string }, b: { timeStamp?: string }) => {
      return new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime();
    });
  }, [account?.payments, selectedInvoice]);

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
            {invoices.map((row) => {
              const selected = String(row._id) === invoiceId;
              return (
                <li key={row._id} className={`rounded-xl ${selected ? 'bg-teal-50' : ''}`}>
                  <button type="button" className="w-full rounded-xl px-2 py-2 text-right" onClick={() => setInvoiceId(String(row._id))}>
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
              );
            })}
          </ul>
        )}
        <h3 className="mb-1 font-medium">گردش پرداخت</h3>
        <p className="mb-3 text-xs text-gray-500">
          {selectedInvoice
            ? `فقط پرداخت‌های فاکتور ${selectedInvoice.invoiceNumber || '—'} نمایش داده می‌شود.`
            : 'هر ردیف یک ثبت است؛ نقد، چک، تخفیف و نسیه جدا دیده می‌شود.'}
        </p>
        {payments.length ? (
          <ul className="space-y-3">
            {payments.map((row: any) => {
              const applied = paymentApplied(row);
              const parts = paymentParts(row);
              const check = checkNote(row);
              return (
                <li key={row._id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">{faDate(row.timeStamp)}</p>
                      <p className="mt-1 text-base font-semibold text-gray-900">{toman(applied)}</p>
                      <p className="text-[11px] text-gray-500">جمع نقد، چک و تخفیف</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] text-gray-600">
                      {paymentTarget(row, payable)}
                    </span>
                  </div>
                  {parts.length ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2">
                      {parts.map((part) => (
                        <div key={part.key} className={`rounded-xl px-3 py-2 ${part.className}`}>
                          <dt className="text-[11px]">{part.label}</dt>
                          <dd className="text-sm font-medium">{toman(part.amount)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">مبلغی برای این ردیف ثبت نشده است.</p>
                  )}
                  {check ? <p className="mt-2 text-xs text-sky-800">چک: {check}</p> : null}
                  {row.description ? <p className="mt-2 text-xs text-gray-600">{String(row.description)}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : person ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            {selectedInvoice ? 'برای این فاکتور پرداختی ثبت نشده است.' : 'هنوز پرداختی برای این شخص ثبت نشده است.'}
          </p>
        ) : (
          <p className="text-sm text-gray-500">ابتدا یک شخص را انتخاب کنید.</p>
        )}
        {person && !invoices.length && !items.length && !account?.payments?.length ? (
          <p className="text-sm text-gray-500">گردشی برای {displayName(account?.person)} نیست</p>
        ) : null}
      </FormCard>
    </div>
  );
}
