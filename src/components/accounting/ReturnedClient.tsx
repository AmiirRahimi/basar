'use client';

import { useMemo, useState, useTransition } from 'react';
import { Minus, Plus } from 'lucide-react';
import { getPersonReturns, receiveReturnedCloth } from '@/actions/crud';
import { ApiWait, Button, Checkbox, FormCard, IconButton, Input, Select, fieldLabelClassName, toast } from '@/ui';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { PriceField, PriceSection } from './Price';
import { useWritable } from './useWritable';
import type { FieldOption } from '@/lib/types';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

type ReturnableLine = {
  key: string;
  invoiceId: string;
  invoiceNumber?: string | number;
  invoiceDate?: string;
  clothId: string;
  label: string;
  boughtCount: number;
  returnedCount: number;
  remainingCount: number;
  boughtPrice: number;
};

type ReturnReceiptItem = {
  _id: string;
  count: number;
  price: number;
  boughtPrice?: number;
  amount: number;
  label: string;
  invoiceNumber?: string | number;
};

type ReturnReceipt = {
  _id: string;
  timeStamp?: string;
  description?: string;
  amount: number;
  items: ReturnReceiptItem[];
};

type PickState = { count: number; price: number };

export function ReturnedClient({ people }: { people: FieldOption[] }) {
  const writable = useWritable();
  const [person, setPerson] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [picks, setPicks] = useState<Record<string, PickState>>({});
  const [description, setDescription] = useState('');
  const [returnable, setReturnable] = useState<ReturnableLine[]>([]);
  const [receipts, setReceipts] = useState<ReturnReceipt[]>([]);
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();

  const invoices = useMemo(() => {
    const map = new Map<string, { id: string; number?: string | number; date?: string; count: number }>();
    for (const row of returnable) {
      const current = map.get(row.invoiceId) || {
        id: row.invoiceId,
        number: row.invoiceNumber,
        date: row.invoiceDate,
        count: 0,
      };
      current.count += 1;
      map.set(row.invoiceId, current);
    }
    return [...map.values()];
  }, [returnable]);

  const lines = returnable.filter((row) => row.invoiceId === invoiceId);
  const chosen = lines.filter((row) => picks[row.key]);
  const credit = chosen.reduce((sum, row) => sum + rowCount(picks[row.key]) * Number(picks[row.key]?.price || 0), 0);

  function load(id: string) {
    startLoad(async () => {
      const res = await getPersonReturns(id);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        setReturnable([]);
        setReceipts([]);
        toast.error(res.message || 'مرجوعی بارگذاری نشد');
        return;
      }
      const data = res.data as {
        returnable?: ReturnableLine[];
        receipts?: ReturnReceipt[];
      };
      setReturnable(Array.isArray(data.returnable) ? data.returnable : []);
      setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
      setInvoiceId('');
      setPicks({});
      setDescription('');
    });
  }

  function toggle(row: ReturnableLine) {
    setPicks((current) => {
      if (current[row.key]) {
        const next = { ...current };
        delete next[row.key];
        return next;
      }
      return {
        ...current,
        [row.key]: { count: 1, price: Math.round(Number(row.boughtPrice || 0)) },
      };
    });
  }

  function setPick(key: string, patch: Partial<PickState>) {
    setPicks((current) => {
      const row = current[key];
      if (!row) return current;
      return { ...current, [key]: { ...row, ...patch } };
    });
  }

  function save() {
    if (!person || !invoiceId) {
      toast.error('مشتری و فاکتور را انتخاب کنید');
      return;
    }
    if (!chosen.length) {
      toast.error('حداقل یک لباس را برای مرجوعی انتخاب کنید');
      return;
    }
    for (const row of chosen) {
      const qty = rowCount(picks[row.key]);
      if (qty < 1 || qty > row.remainingCount) {
        toast.error(`تعداد مرجوعی «${row.label}» بیشتر از مانده خرید است`);
        return;
      }
      const unit = Number(picks[row.key]?.price);
      if (!Number.isFinite(unit) || unit < 0) {
        toast.error(`قیمت برگشت «${row.label}» را وارد کنید`);
        return;
      }
    }
    startSave(async () => {
      const res = await receiveReturnedCloth({
        personId: person,
        invoiceId,
        description,
        items: chosen.map((row) => ({
          clothId: row.clothId,
          count: rowCount(picks[row.key]),
          price: Number(picks[row.key]?.price || 0),
        })),
      });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'مرجوعی ثبت نشد');
        return;
      }
      toast.success(res.message || 'لباس دریافت شد و به حساب مشتری بستانکار شد');
      load(person);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FormCard>
        <div className="grid gap-3">
          <Select
            label="مشتری"
            options={people}
            value={person}
            searchable
            placeholder="انتخاب کنید"
            labels={selectLabels}
            onChange={(value) => {
              const id = String(value || '');
              setPerson(id);
              setInvoiceId('');
              setPicks({});
              setReturnable([]);
              setReceipts([]);
              if (id) load(id);
            }}
          />
          {person && !loading ? (
            <Select
              label="فاکتور"
              options={invoices.map((row) => ({
                value: row.id,
                label: [`فاکتور ${row.number || '—'}`, faDate(row.date), `${faNumber(row.count)} لباس`].join(' - '),
              }))}
              value={invoiceId}
              searchable
              placeholder={invoices.length ? 'فاکتور را انتخاب کنید' : 'فاکتور قابل مرجوعی نیست'}
              disabled={!invoices.length}
              labels={selectLabels}
              onChange={(value) => {
                setInvoiceId(String(value || ''));
                setPicks({});
              }}
            />
          ) : null}
        </div>

        <h3 className="mt-5 mb-2 font-medium">لباس‌های این فاکتور</h3>
        {loading ? (
          <ApiWait title="در حال بارگذاری مرجوعی…" hint="فاکتورها و لباس‌های قابل برگشت دارد می‌آید." />
        ) : null}
        {!person && !loading ? <p className="text-sm text-gray-500">ابتدا مشتری را انتخاب کنید.</p> : null}
        {person && !loading && !invoices.length ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            لباس قابل مرجوعی برای این مشتری نمانده است.
          </p>
        ) : null}
        {person && !loading && invoices.length && !invoiceId ? (
          <p className="text-sm text-gray-500">فاکتور را انتخاب کنید تا لباس‌های خریده‌شده بیاید.</p>
        ) : null}

        {!loading && invoiceId ? (
          <div className="space-y-3 rounded-xl border border-gray-200 p-3">
            {lines.map((row) => {
              const pick = picks[row.key];
              const qty = rowCount(pick);
              return (
                <div key={row.key} className="space-y-3 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Checkbox
                      checked={Boolean(pick)}
                      onChange={() => toggle(row)}
                      label={row.label}
                      disabled={!writable}
                    />
                    <span className="shrink-0 text-xs text-gray-600">خریده شده {faNumber(row.boughtCount)} عدد</span>
                  </div>
                  {row.returnedCount ? (
                    <p className="text-xs text-gray-500">
                      قبلاً {faNumber(row.returnedCount)} عدد مرجوع شده · مانده {faNumber(row.remainingCount)} عدد
                    </p>
                  ) : null}
                  {pick ? (
                    <div className="grid gap-3 border-t border-gray-200/80 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)]">
                      <div>
                        <p className={fieldLabelClassName()}>تعداد مرجوعی</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <IconButton
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label="کم کردن تعداد"
                            disabled={qty <= 1}
                            onClick={() => setPick(row.key, { count: Math.max(1, qty - 1) })}
                          >
                            <Minus className="h-4 w-4" />
                          </IconButton>
                          <span className="min-w-10 text-center text-sm font-medium">{faNumber(qty)}</span>
                          <IconButton
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label="زیاد کردن تعداد"
                            disabled={qty >= row.remainingCount}
                            onClick={() => setPick(row.key, { count: Math.min(row.remainingCount, qty + 1) })}
                          >
                            <Plus className="h-4 w-4" />
                          </IconButton>
                          <span className="text-xs text-gray-500">از {faNumber(row.remainingCount)}</span>
                        </div>
                      </div>
                      <PriceField
                        label="قیمت مرجوعی"
                        value={pick.price}
                        onChange={(price) => setPick(row.key, { price })}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {writable && invoiceId ? (
          <div className="mt-5 grid gap-3 border-t border-gray-100 pt-4">
            <Input
              label="توضیحات"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <PriceSection
              label="بستانکار این مرجوعی"
              value={credit}
              description="جمع قیمت لباس‌های انتخاب‌شده. این مبلغ از مانده بدهی مشتری کم می‌شود."
            />
            <Button type="button" loading={saving} disabled={!chosen.length || loading} onClick={save}>
              ثبت مرجوعی
            </Button>
          </div>
        ) : null}
      </FormCard>

      <FormCard>
        <h3 className="mb-1 font-medium">مرجوعی‌های ثبت‌شده</h3>
        <p className="mb-4 text-xs text-gray-500">
          هر دریافت به حساب مشتری اضافه می‌شود؛ این مبلغ را شما به مشتری بدهکارید مگر از بدهی فاکتورها کم شود.
        </p>
        {person && receipts.length ? (
          <ul className="space-y-3">
            {receipts.map((row) => (
              <li key={row._id} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{faDate(row.timeStamp)}</p>
                    <p className="mt-1 text-sm font-semibold">{toman(row.amount)}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-gray-600">بستانکار مشتری</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {row.items.map((item) => (
                    <li key={item._id} className="rounded-xl bg-white px-3 py-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span>{item.label}</span>
                        <span>{toman(item.amount)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {faNumber(item.count)} عدد
                        {item.invoiceNumber ? ` · فاکتور ${item.invoiceNumber}` : ''}
                        {' · '}
                        {toman(item.price)}
                        {item.boughtPrice && item.boughtPrice !== item.price ? ` (خرید ${toman(item.boughtPrice)})` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
                {row.description ? <p className="mt-2 text-xs text-gray-600">{row.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            {person ? 'هنوز مرجوعی برای این مشتری ثبت نشده است.' : 'ابتدا یک مشتری را انتخاب کنید.'}
          </p>
        )}
      </FormCard>
    </div>
  );
}

function rowCount(pick?: PickState) {
  return Math.trunc(Number(pick?.count || 0));
}
