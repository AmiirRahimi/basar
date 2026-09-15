'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import {
  BasicTable,
  Button,
  EmptyState,
  FormCard,
  IconButton,
  Input,
  Modal,
  Select,
  toast,
} from '@/ui';
import {
  createResource,
  deleteResource,
  getInvoiceCart,
  updateResource,
} from '@/actions/crud';
import { displayName, faDate, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { FieldOption, Invoice } from '@/lib/types';

type DraftItem = {
  key: string;
  _cloth: string;
  count: number;
  price: number;
};

type SummaryState = {
  id: string;
  invoiceNumber?: string | number;
  ownerName: string;
  address: string;
  items: { label: string; count: number; price: number }[];
};

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

function emptyItem(): DraftItem {
  return { key: crypto.randomUUID(), _cloth: '', count: 1, price: 0 };
}

function relationId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'object' && value && '_id' in value) {
    return String((value as { _id?: unknown })._id ?? '');
  }
  return String(value);
}

function optionLabel(options: FieldOption[], value: string) {
  return options.find((option) => option.value === value)?.label || value || '—';
}

export function InvoiceCrud({
  invoices,
  people,
  clothes,
}: {
  invoices: Invoice[];
  people: FieldOption[];
  clothes: FieldOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [showErrors, setShowErrors] = useState(false);
  const [pending, start] = useTransition();

  const totals = useMemo(() => {
    const count = items.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const amount = items.reduce((sum, item) => sum + Number(item.count || 0) * Number(item.price || 0), 0);
    return { count, amount };
  }, [items]);

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<Invoice>();
    const defs: ColumnDef<Invoice, any>[] = [
      helper.accessor((row) => row.invoiceNumber, {
        id: 'invoiceNumber',
        header: 'شماره فاکتور',
        cell: (info) => String(info.getValue() ?? '—'),
      }),
      helper.accessor((row) => row._client, {
        id: '_client',
        header: 'صاحب فاکتور',
        cell: (info) => displayName(info.getValue()),
      }),
      helper.accessor((row) => row.receiverAddress, {
        id: 'receiverAddress',
        header: 'آدرس',
        cell: (info) => String(info.getValue() || '—'),
      }),
      helper.accessor((row) => row.timeStamp, {
        id: 'timeStamp',
        header: 'تاریخ',
        cell: (info) => faDate(info.getValue()),
      }),
      helper.accessor((row) => row.isSent, {
        id: 'isSent',
        header: 'وضعیت',
        cell: (info) => (info.getValue() ? 'ارسال شده' : 'پیش‌نویس'),
      }),
    ];
    defs.push(
      helper.display({
        id: 'actions',
        header: 'عملیات',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(row.original)}>
              ویرایش
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/counting/invoices/${row.original._id}/print`)}
            >
              چاپ
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                start(async () => {
                  const res = await deleteResource('invoice', row.original._id);
                  if (redirectIfUnauthorized(res)) return;
                  if (res.ok) toast.success(res.message || 'حذف شد');
                  else toast.error(res.message || 'حذف نشد');
                  router.refresh();
                })
              }
            >
              حذف
            </Button>
          </div>
        ),
      }),
    );
    return defs;
  }, [router]);

  const table = useReactTable({
    data: invoices,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row._id),
  });

  function resetForm() {
    setEditing(null);
    setClient('');
    setAddress('');
    setItems([emptyItem()]);
    setShowErrors(false);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(invoice: Invoice) {
    setEditing(invoice);
    setClient(relationId(invoice._client));
    setAddress(invoice.receiverAddress || '');
    setItems([emptyItem()]);
    setShowErrors(false);
    setOpen(true);
    start(async () => {
      const cart = await getInvoiceCart(invoice._id);
      if (redirectIfUnauthorized(cart)) return;
      const lines = Array.isArray(cart.data) ? cart.data : [];
      setItems(
        lines.length
          ? lines.map((line: { _cloth?: unknown; count?: number; price?: number }) => ({
              key: crypto.randomUUID(),
              _cloth: relationId(line._cloth),
              count: Number(line.count || 1),
              price: Number(line.price || 0),
            }))
          : [emptyItem()],
      );
    });
  }

  function setItem(key: string, patch: Partial<DraftItem>) {
    setItems((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addItem() {
    setItems((rows) => [...rows, emptyItem()]);
  }

  function removeItem(key: string) {
    setItems((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  function onClientChange(value: string) {
    setClient(value);
    const person = people.find((option) => option.value === value);
    if (person?.address && !address.trim()) setAddress(person.address);
  }

  function missingOwner() {
    return !client.trim();
  }

  function invalidItems() {
    return items.filter((item) => !item._cloth || Number(item.count) < 1);
  }

  function submit() {
    const badItems = invalidItems();
    if (missingOwner() || badItems.length) {
      setShowErrors(true);
      const parts = [
        missingOwner() ? 'صاحب فاکتور' : '',
        badItems.length ? 'اقلام (محصول و تعداد)' : '',
      ].filter(Boolean);
      toast.error(`تکمیل این موارد الزامی است: ${parts.join('، ')}`);
      return;
    }
    setShowErrors(false);
    start(async () => {
      const payload = {
        _client: client,
        receiverAddress: address,
        items: items.map(({ _cloth, count, price }) => ({
          _cloth,
          count: Number(count),
          price: Number(price),
        })),
      };
      const res = editing
        ? await updateResource('invoice', editing._id, payload)
        : await createResource('invoice', payload);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ثبت نشد');
        return;
      }
      toast.success(res.message || 'ثبت شد');
      const saved = (res.data || {}) as Invoice;
      setSummary({
        id: String(saved._id || editing?._id || ''),
        invoiceNumber: saved.invoiceNumber ?? editing?.invoiceNumber,
        ownerName: optionLabel(people, client) || displayName(saved._client),
        address,
        items: items.map((item) => ({
          label: optionLabel(clothes, item._cloth),
          count: Number(item.count),
          price: Number(item.price),
        })),
      });
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  const summaryTotals = summary
    ? {
        count: summary.items.reduce((sum, item) => sum + item.count, 0),
        amount: summary.items.reduce((sum, item) => sum + item.count * item.price, 0),
      }
    : { count: 0, amount: 0 };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>ثبت فاکتور</Button>
      </div>
      {invoices.length ? (
        <BasicTable table={table} isLoading={pending} labels={{ nothingToShow: 'موردی نیست' }} />
      ) : (
        <EmptyState message="هنوز فاکتور ثبت نشده" />
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} size="xl">
        <FormCard>
          <h3 className="mb-4 text-lg font-medium">{editing ? 'ویرایش فاکتور' : 'ثبت فاکتور'}</h3>
          <div className="grid gap-3">
            <Select
              label="صاحب فاکتور *"
              error={showErrors && missingOwner() ? 'الزامی است' : undefined}
              value={client}
              onChange={(v) => onClientChange(String(v ?? ''))}
              options={people}
              searchable
              placeholder="انتخاب کنید"
              labels={selectLabels}
            />
            <Input
              label="آدرس"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="mt-2 space-y-3 rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">اقلام</h4>
                <IconButton type="button" variant="outline" size="sm" onClick={addItem} aria-label="افزودن قلم">
                  <Plus className="h-4 w-4" />
                </IconButton>
              </div>
              {items.map((item) => {
                const itemError = showErrors && (!item._cloth || Number(item.count) < 1);
                return (
                  <div
                    key={item.key}
                    className="grid gap-2 rounded-lg bg-gray-50 p-3 md:grid-cols-[minmax(0,1.4fr)_7rem_8rem_auto_auto] md:items-end"
                  >
                    <Select
                      label="محصول *"
                      error={itemError && !item._cloth ? 'الزامی است' : undefined}
                      value={item._cloth}
                      onChange={(v) => setItem(item.key, { _cloth: String(v ?? '') })}
                      options={clothes}
                      searchable
                      placeholder="انتخاب کنید"
                      labels={selectLabels}
                    />
                    <Input
                      label="تعداد *"
                      type="number"
                      min={1}
                      error={itemError && Number(item.count) < 1 ? 'الزامی است' : undefined}
                      value={item.count}
                      onChange={(e) => setItem(item.key, { count: Number(e.target.value) })}
                    />
                    <Input
                      label="فی"
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(e) => setItem(item.key, { price: Number(e.target.value) })}
                    />
                    <div className="pb-2 text-sm text-gray-600">
                      {toman(Number(item.count || 0) * Number(item.price || 0))}
                    </div>
                    <IconButton
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mb-1"
                      disabled={items.length <= 1}
                      onClick={() => removeItem(item.key)}
                      aria-label="حذف قلم"
                    >
                      <Minus className="h-4 w-4" />
                    </IconButton>
                  </div>
                );
              })}
              <div className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm">
                <span>جمع تعداد: {totals.count}</span>
                <span className="font-medium">جمع مبلغ: {toman(totals.amount)}</span>
              </div>
            </div>

            <Button onClick={submit} disabled={pending}>
              ذخیره
            </Button>
          </div>
        </FormCard>
      </Modal>

      <Modal isOpen={Boolean(summary)} onClose={() => setSummary(null)} size="lg">
        <FormCard>
          <h3 className="mb-4 text-lg font-medium">شرح فاکتور</h3>
          {summary ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-1">
                <p>شماره: {summary.invoiceNumber ?? '—'}</p>
                <p>صاحب فاکتور: {summary.ownerName}</p>
                <p>آدرس: {summary.address || '—'}</p>
              </div>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-right">محصول</th>
                      <th className="p-3 text-right">تعداد</th>
                      <th className="p-3 text-right">فی</th>
                      <th className="p-3 text-right">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.items.map((item, index) => (
                      <tr key={`${item.label}-${index}`} className="border-t">
                        <td className="p-3">{item.label}</td>
                        <td className="p-3">{item.count}</td>
                        <td className="p-3">{toman(item.price)}</td>
                        <td className="p-3">{toman(item.count * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-between gap-2 font-medium">
                <span>جمع تعداد: {summaryTotals.count}</span>
                <span>جمع مبلغ: {toman(summaryTotals.amount)}</span>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setSummary(null)}>
                  بستن
                </Button>
                <Button onClick={() => router.push(`/counting/invoices/${summary.id}/print`)}>
                  چاپ فاکتور
                </Button>
              </div>
            </div>
          ) : null}
        </FormCard>
      </Modal>
    </div>
  );
}
