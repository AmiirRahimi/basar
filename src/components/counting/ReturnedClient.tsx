'use client';

import { useState, useTransition } from 'react';
import { Minus, Plus } from 'lucide-react';
import { getPersonReturns, receiveReturnedCloth } from '@/actions/crud';
import { Button, FormCard, IconButton, Input, Select, toast } from '@/ui';
import { displayName, faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
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

export function ReturnedClient({ people }: { people: FieldOption[] }) {
  const writable = useWritable();
  const [person, setPerson] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [count, setCount] = useState(1);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [returnable, setReturnable] = useState<ReturnableLine[]>([]);
  const [receipts, setReceipts] = useState<ReturnReceipt[]>([]);
  const [returnTotal, setReturnTotal] = useState(0);
  const [personName, setPersonName] = useState('');
  const [pending, start] = useTransition();

  const selected = returnable.find((row) => row.key === selectedKey);

  function load(id: string) {
    start(async () => {
      const res = await getPersonReturns(id);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        setReturnable([]);
        setReceipts([]);
        setReturnTotal(0);
        setPersonName('');
        toast.error(res.message || 'برگشتی بارگذاری نشد');
        return;
      }
      const data = res.data as {
        person?: { fullName?: string };
        returnable?: ReturnableLine[];
        receipts?: ReturnReceipt[];
        returnTotal?: number;
      };
      const lines = Array.isArray(data.returnable) ? data.returnable : [];
      setReturnable(lines);
      setReceipts(Array.isArray(data.receipts) ? data.receipts : []);
      setReturnTotal(Number(data.returnTotal || 0));
      setPersonName(displayName(data.person));
      const first = lines[0];
      setSelectedKey(first?.key || '');
      setCount(first ? Math.min(1, first.remainingCount) || 1 : 1);
      setPrice(first ? Number(first.boughtPrice || 0) : 0);
      setDescription('');
    });
  }

  function pick(row: ReturnableLine) {
    setSelectedKey(row.key);
    setCount(1);
    setPrice(Number(row.boughtPrice || 0));
  }

  function receive(useBoughtPrice: boolean) {
    if (!person || !selected) {
      toast.error('شخص و لباس برگشتی را انتخاب کنید');
      return;
    }
    const qty = Math.trunc(Number(count || 0));
    if (qty < 1 || qty > selected.remainingCount) {
      toast.error('تعداد برگشتی بیشتر از مانده خرید است');
      return;
    }
    const unit = useBoughtPrice ? selected.boughtPrice : Number(price);
    if (!useBoughtPrice && (!Number.isFinite(unit) || unit < 0)) {
      toast.error('قیمت دریافت را وارد کنید');
      return;
    }
    start(async () => {
      const res = await receiveReturnedCloth({
        personId: person,
        invoiceId: selected.invoiceId,
        clothId: selected.clothId,
        count: qty,
        price: unit,
        useBoughtPrice,
        description,
      });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'برگشتی ثبت نشد');
        return;
      }
      toast.success(res.message || 'لباس دریافت شد و به حساب مشتری بستانکار شد');
      load(person);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FormCard>
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
            setSelectedKey('');
            setReturnable([]);
            setReceipts([]);
            if (id) load(id);
          }}
        />
        {person ? (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">
            <p>برگشتی‌های {personName || 'این مشتری'} به حسابش بستانکار می‌شود.</p>
            <p className="mt-1 text-base font-semibold">بستانکار از برگشت: {toman(returnTotal)}</p>
            <p className="mt-1 text-xs text-gray-500">این مبلغ از مانده بدهی مشتری کم می‌شود؛ اگر بیشتر باشد شما به مشتری بدهکارید.</p>
          </div>
        ) : null}
        <h3 className="mt-5 mb-2 font-medium">لباس خریده‌شده</h3>
        {pending ? <p className="text-sm text-gray-500">در حال بارگذاری...</p> : null}
        {person && !pending && !returnable.length ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            لباس قابل برگشتی برای این مشتری نمانده است.
          </p>
        ) : null}
        {!person ? <p className="text-sm text-gray-500">ابتدا مشتری را انتخاب کنید.</p> : null}
        <ul className="space-y-2">
          {returnable.map((row) => {
            const active = row.key === selectedKey;
            return (
              <li key={row.key}>
                <button
                  type="button"
                  className={`w-full rounded-2xl border px-3 py-3 text-right ${
                    active ? 'border-teal-300 bg-teal-50/80' : 'border-gray-100 bg-gray-50/80'
                  }`}
                  onClick={() => pick(row)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{row.label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">فاکتور {row.invoiceNumber || '—'}</p>
                    </div>
                    <span className="text-xs text-gray-600">{faNumber(row.remainingCount)} عدد مانده</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    خرید {faNumber(row.boughtCount)} عدد · قیمت خرید {toman(row.boughtPrice)}
                    {row.returnedCount ? ` · قبلاً ${faNumber(row.returnedCount)} برگشت` : ''}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
        {selected && writable ? (
          <div className="mt-5 grid gap-3 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-600">
              دریافت {selected.label} از فاکتور {selected.invoiceNumber || '—'}
            </p>
            <div>
              <p className="mb-1 text-sm text-gray-700">تعداد</p>
              <div className="flex items-center gap-2">
                <IconButton
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="کم کردن تعداد"
                  disabled={count <= 1}
                  onClick={() => setCount((value) => Math.max(1, value - 1))}
                >
                  <Minus className="h-4 w-4" />
                </IconButton>
                <span className="min-w-10 text-center text-sm font-medium">{faNumber(count)}</span>
                <IconButton
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="زیاد کردن تعداد"
                  disabled={count >= selected.remainingCount}
                  onClick={() => setCount((value) => Math.min(selected.remainingCount, value + 1))}
                >
                  <Plus className="h-4 w-4" />
                </IconButton>
                <span className="text-xs text-gray-500">از {faNumber(selected.remainingCount)}</span>
              </div>
            </div>
            <Input
              label="قیمت واحد برای دریافت"
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
            />
            <p className="text-xs text-gray-500">قیمت خرید این لباس {toman(selected.boughtPrice)} است. می‌توانید همان را بزنید یا قیمت دیگری بدهید.</p>
            <Input
              label="توضیحات"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" loading={pending} onClick={() => receive(true)}>
                دریافت با قیمت خرید
              </Button>
              <Button type="button" variant="outline" loading={pending} onClick={() => receive(false)}>
                دریافت با قیمت دیگر
              </Button>
            </div>
            <p className="text-sm font-medium text-gray-800">
              مبلغ بستانکار این دریافت: {toman(count * Number(price))}
            </p>
          </div>
        ) : null}
      </FormCard>
      <FormCard>
        <h3 className="mb-1 font-medium">برگشتی‌های ثبت‌شده</h3>
        <p className="mb-4 text-xs text-gray-500">هر دریافت به حساب مشتری اضافه می‌شود؛ این مبلغ را شما به مشتری بدهکارید مگر از بدهی فاکتورها کم شود.</p>
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
            {person ? 'هنوز برگشتی برای این مشتری ثبت نشده است.' : 'ابتدا یک مشتری را انتخاب کنید.'}
          </p>
        )}
      </FormCard>
    </div>
  );
}
