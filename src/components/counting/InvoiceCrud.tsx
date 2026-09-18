'use client';

import { useMemo, useState, useTransition } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { Banknote, Minus, Plus, Printer } from 'lucide-react';
import {
  Button,
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
  getInvoiceBalance,
  getInvoiceCart,
  updateResource,
} from '@/actions/crud';
import { displayName, faDate, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { checkAvailableForPayment } from '@/lib/checks';
import { PaymentForm } from './PaymentForm';
import { RowActions } from './RowActions';
import { useWritable } from './useWritable';
import {
  addPacks,
  formatPacksFa,
  itemsToPacks,
  mergePacks,
  orderToPacks,
  packsFromCloth,
  packsToOrder,
  subtractPacks,
  takePack,
  totalItems,
  type ClothPack,
} from '@/lib/packs';
import type { Check, FieldOption, Invoice } from '@/lib/types';
import { SearchableTable } from './SearchableTable';
import { InvoicePackStepper } from './InvoicePackStepper';
import { usePageAddButton } from './PageAction';

type DraftItem = {
  key: string;
  _cloth: string;
  count: number;
  packs: ClothPack[];
  takenOrder: number[];
  price: number;
};

type SummaryState = {
  id: string;
  personId: string;
  invoiceNumber?: string | number;
  ownerName: string;
  address: string;
  items: { label: string; count: number; price: number; packs?: ClothPack[] }[];
};

type PayState = {
  invoiceId: string;
  personId: string;
  total: number;
  remaining: number;
};

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

function emptyItem(): DraftItem {
  return { key: crypto.randomUUID(), _cloth: '', count: 0, packs: [], takenOrder: [], price: 0 };
}

function lineFromCloth(option: FieldOption | undefined, packs: ClothPack[], price?: number): Pick<DraftItem, 'count' | 'packs' | 'takenOrder' | 'price'> {
  const stock = option ? packsFromCloth(option) : { packSize: 1, packs: [] };
  return {
    packs,
    takenOrder: packsToOrder(packs, stock.packSize),
    count: totalItems(packs),
    price: price ?? Number(option?.price || 0),
  };
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
  checks,
}: {
  invoices: Invoice[];
  people: FieldOption[];
  clothes: FieldOption[];
  checks: Check[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [payFor, setPayFor] = useState<PayState | null>(null);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [originalLines, setOriginalLines] = useState<DraftItem[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [pending, start] = useTransition();
  const writable = useWritable();

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
      helper.accessor((row) => row.storeName || row._storeId, {
        id: 'store',
        header: 'فروشگاه فروشنده',
        cell: (info) => {
          const row = info.row.original;
          const store = row._storeId;
          const storeName =
            row.storeName ||
            (store && typeof store === 'object' ? String(store.name || '') : '');
          const brand =
            row.brandName ||
            (store && typeof store === 'object' && store._brandId && typeof store._brandId === 'object'
              ? String(store._brandId.name || '')
              : '');
          return [brand, storeName].filter(Boolean).join(' / ') || '—';
        },
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
        size: 176,
        enableHiding: false,
        cell: ({ row }) => (
          <RowActions
            onEdit={writable ? () => openEdit(row.original) : undefined}
            extraActions={[
              ...(writable
                ? [
                    {
                      label: 'پرداخت',
                      icon: <Banknote className="size-3.5" />,
                      onClick: () => openPay(row.original),
                    },
                  ]
                : []),
              {
                label: 'چاپ',
                icon: <Printer className="size-3.5" />,
                onClick: () => router.push(`/counting/invoices/${row.original._id}/print`),
              },
            ]}
            onDelete={
              writable
                ? async () => {
                    const res = await deleteResource('invoice', row.original._id);
                    if (redirectIfUnauthorized(res)) return;
                    if (res.ok) toast.success(res.message || 'حذف شد');
                    else toast.error(res.message || 'حذف نشد');
                    router.refresh();
                  }
                : undefined
            }
          />
        ),
      }),
    );
    return defs;
  }, [router, writable]);

  function extraSearch(row: Invoice) {
    const store = row._storeId;
    const storeName =
      row.storeName || (store && typeof store === 'object' ? String(store.name || '') : '');
    const brand =
      row.brandName ||
      (store && typeof store === 'object' && store._brandId && typeof store._brandId === 'object'
        ? String(store._brandId.name || '')
        : '');
    return [
      displayName(row._client),
      faDate(row.timeStamp),
      row.isSent ? 'ارسال شده' : 'پیش‌نویس',
      storeName,
      brand,
      row.receiverAddress,
    ].join(' ');
  }

  function resetForm() {
    setEditing(null);
    setClient('');
    setAddress('');
    setItems([emptyItem()]);
    setOriginalLines([]);
    setShowErrors(false);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function draftFromLine(line: { _cloth?: unknown; count?: number; price?: number; packs?: ClothPack[] }): DraftItem {
    const clothId = relationId(line._cloth);
    const option = clothes.find((item) => item.value === clothId);
    const stock = packsFromCloth(option || { count: line.count, packs: line.packs, packSize: option?.packSize });
    const packs = mergePacks(line.packs || []).length
      ? mergePacks(line.packs || [])
      : itemsToPacks(Number(line.count || 0), stock.packSize);
    return {
      key: crypto.randomUUID(),
      _cloth: clothId,
      ...lineFromCloth(option, packs, Number(line.price || option?.price || 0)),
    };
  }

  function availableFor(item: DraftItem, allItems = items): ClothPack[] {
    const option = clothes.find((row) => row.value === item._cloth);
    if (!option) return [];
    let stock = packsFromCloth(option).packs;
    const restored = originalLines
      .filter((line) => line._cloth === item._cloth)
      .reduce((packs, line) => addPacks(packs, line.packs), [] as ClothPack[]);
    stock = addPacks(stock, restored);
    for (const line of allItems) {
      if (line.key === item.key || line._cloth !== item._cloth) continue;
      stock = subtractPacks(stock, line.packs) || [];
    }
    return stock;
  }

  function openEdit(invoice: Invoice) {
    setEditing(invoice);
    setClient(relationId(invoice._client));
    setAddress(invoice.receiverAddress || '');
    setItems([emptyItem()]);
    setOriginalLines([]);
    setShowErrors(false);
    setOpen(true);
    start(async () => {
      const cart = await getInvoiceCart(invoice._id);
      if (redirectIfUnauthorized(cart)) return;
      const lines = Array.isArray(cart.data) ? cart.data : [];
      const next = lines.length ? lines.map((line) => draftFromLine(line)) : [emptyItem()];
      setItems(next);
      setOriginalLines(next);
    });
  }

  function changeCloth(key: string, clothId: string) {
    const option = clothes.find((row) => row.value === clothId);
    setItem(key, {
      _cloth: clothId,
      ...lineFromCloth(option, [], option?.price),
    });
  }

  function takePackOnLine(key: string, itemsInPack: number) {
    setItems((rows) =>
      rows.map((row) => {
        if (row.key !== key) return row;
        const available = availableFor(row, rows);
        const remaining = subtractPacks(available, row.packs) || [];
        if (!takePack(remaining, itemsInPack)) return row;
        const takenOrder = [...row.takenOrder, itemsInPack];
        const packs = orderToPacks(takenOrder);
        return { ...row, takenOrder, packs, count: totalItems(packs) };
      }),
    );
  }

  function untakePackOnLine(key: string) {
    setItems((rows) =>
      rows.map((row) => {
        if (row.key !== key || !row.takenOrder.length) return row;
        const takenOrder = row.takenOrder.slice(0, -1);
        const packs = orderToPacks(takenOrder);
        return { ...row, takenOrder, packs, count: totalItems(packs) };
      }),
    );
  }

  function openPay(invoice: Invoice) {
    start(async () => {
      const res = await getInvoiceBalance(invoice._id);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        toast.error(res.message || 'مانده فاکتور پیدا نشد');
        return;
      }
      const data = res.data as { total?: number; remaining?: number; invoice?: Invoice };
      setPayFor({
        invoiceId: invoice._id,
        personId: relationId(invoice._client),
        total: Number(data.total || 0),
        remaining: Number(data.remaining || 0),
      });
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
        items: items.map(({ _cloth, count, price, packs }) => ({
          _cloth,
          count: Number(count),
          price: Number(price),
          packs,
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
        personId: client,
        invoiceNumber: saved.invoiceNumber ?? editing?.invoiceNumber,
        ownerName: optionLabel(people, client) || displayName(saved._client),
        address,
        items: items.map((item) => ({
          label: optionLabel(clothes, item._cloth),
          count: Number(item.count),
          price: Number(item.price),
          packs: item.packs,
        })),
      });
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  function checksForPerson(personId: string): FieldOption[] {
    return checks
      .filter((row) => checkAvailableForPayment(row) && (!personId || relationId(row._owner) === personId))
      .map((row) => ({
        value: row._id,
        label: `${toman(row.amount)} — ${row.dueDate || ''}${row.serialNumber ? ` — ${row.serialNumber}` : ''}`,
        price: Number(row.amount || 0),
      }));
  }

  const summaryTotals = summary
    ? {
        count: summary.items.reduce((sum, item) => sum + item.count, 0),
        amount: summary.items.reduce((sum, item) => sum + item.count * item.price, 0),
      }
    : { count: 0, amount: 0 };

  usePageAddButton({
    label: 'ثبت فاکتور',
    onClick: openCreate,
    enabled: writable,
  });

  return (
    <div className="space-y-4">
      <SearchableTable
        storageKey="invoice"
        data={invoices}
        columns={tableColumns}
        getRowId={(row) => String(row._id)}
        extraSearch={extraSearch}
        isLoading={pending}
        emptyMessage="هنوز فاکتور ثبت نشده"
      />

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
                const option = clothes.find((row) => row.value === item._cloth);
                const stock = packsFromCloth(option || {});
                return (
                  <div
                    key={item.key}
                    className="grid gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(14rem,1fr)_8rem_auto_auto] md:items-start"
                  >
                    <Select
                      label="محصول *"
                      error={itemError && !item._cloth ? 'الزامی است' : undefined}
                      value={item._cloth}
                      onChange={(v) => changeCloth(item.key, String(v ?? ''))}
                      options={clothes}
                      searchable
                      placeholder="انتخاب کنید"
                      labels={selectLabels}
                    />
                    {item._cloth ? (
                      <InvoicePackStepper
                        packSize={stock.packSize}
                        available={availableFor(item)}
                        taken={item.packs}
                        error={itemError && Number(item.count) < 1 ? 'حداقل یک بسته اضافه کنید' : undefined}
                        onTake={(itemsInPack) => takePackOnLine(item.key, itemsInPack)}
                        onUntake={() => untakePackOnLine(item.key)}
                      />
                    ) : (
                      <p className="self-center text-sm text-gray-500">ابتدا محصول را انتخاب کنید</p>
                    )}
                    <Input
                      label="فی"
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={(e) => setItem(item.key, { price: Number(e.target.value) })}
                    />
                    <div className="pb-2 text-sm text-gray-600 md:pt-8">
                      {toman(Number(item.count || 0) * Number(item.price || 0))}
                    </div>
                    <IconButton
                      type="button"
                      variant="outline"
                      size="sm"
                      className="md:mt-8"
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
                      <th className="p-3 text-right">بسته‌ها</th>
                      <th className="p-3 text-right">تعداد</th>
                      <th className="p-3 text-right">فی</th>
                      <th className="p-3 text-right">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.items.map((item, index) => (
                      <tr key={`${item.label}-${index}`} className="border-t">
                        <td className="p-3">{item.label}</td>
                        <td className="p-3">{formatPacksFa(item.packs || [])}</td>
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
              {writable ? (
                <PaymentForm
                  personId={summary.personId}
                  invoiceId={summary.id}
                  total={summaryTotals.amount}
                  remaining={summaryTotals.amount}
                  checks={checksForPerson(summary.personId)}
                  onSaved={() => {
                    setSummary(null);
                    router.refresh();
                  }}
                />
              ) : null}
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

      <Modal isOpen={Boolean(payFor)} onClose={() => setPayFor(null)} size="lg">
        <FormCard>
          <h3 className="mb-4 text-lg font-medium">پرداخت فاکتور</h3>
          {payFor ? (
            <PaymentForm
              personId={payFor.personId}
              invoiceId={payFor.invoiceId}
              total={payFor.total}
              remaining={payFor.remaining}
              checks={checksForPerson(payFor.personId)}
              onSaved={() => {
                setPayFor(null);
                router.refresh();
              }}
            />
          ) : null}
        </FormCard>
      </Modal>
    </div>
  );
}
