'use client';

import { useMemo, useState, useTransition } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button, DatePicker, FormCard, IconButton, Input, Modal, Select, toast } from '@/ui';
import { createPayment, createReceivedCheck } from '@/actions/crud';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { toman } from '@/lib/format';
import { checkSerialLabel } from '@/lib/checks';
import type { FieldOption } from '@/lib/types';
import { Price, PriceField, PriceSection } from './Price';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

const PAY_METHODS = {
  cash: 'نقد',
  check: 'چک',
  both: 'نقد و چک',
  credit: 'نسیه دفتر',
} as const;

type PayMethod = keyof typeof PAY_METHODS;
type CheckRow = { key: string; checkId: string };

function emptyRow(): CheckRow {
  return { key: crypto.randomUUID(), checkId: '' };
}

function checkOption(row: {
  _id?: unknown;
  amount?: number;
  dueDate?: string;
  series?: string;
  serialNumber?: number;
}): FieldOption {
  const serial = checkSerialLabel(row);
  return {
    value: String(row._id),
    label: `${toman(row.amount)} — ${row.dueDate || ''}${serial ? ` — ${serial}` : ''}`,
    price: Number(row.amount || 0),
  };
}

export function PaymentForm({
  personId,
  invoiceId,
  total,
  remaining,
  checks,
  payable = false,
  onSaved,
}: {
  personId: string;
  invoiceId?: string;
  total: number;
  remaining: number;
  checks: FieldOption[];
  payable?: boolean;
  onSaved?: () => void;
}) {
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PayMethod>('cash');
  const [cash, setCash] = useState(0);
  const [rows, setRows] = useState<CheckRow[]>([emptyRow()]);
  const [extraChecks, setExtraChecks] = useState<FieldOption[]>([]);
  const [modalFor, setModalFor] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const usesCheck = method === 'check' || method === 'both';
  const usesCash = method === 'cash' || method === 'both';
  const allChecks = useMemo(() => {
    const map = new Map<string, FieldOption>();
    for (const option of [...checks, ...extraChecks]) map.set(option.value, option);
    return [...map.values()];
  }, [checks, extraChecks]);
  const selectedIds = rows.map((row) => row.checkId).filter(Boolean);
  const appliedCheck = usesCheck
    ? selectedIds.reduce((sum, id) => sum + Number(allChecks.find((option) => option.value === id)?.price || 0), 0)
    : 0;
  const cashValue = usesCash ? Number(cash || 0) : 0;
  const credit = Math.max(0, remaining - Number(discount || 0) - cashValue - appliedCheck);

  function reset() {
    setDiscount(0);
    setMethod('cash');
    setCash(0);
    setRows([emptyRow()]);
    setExtraChecks([]);
    setModalFor(null);
  }

  function setRow(key: string, checkId: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, checkId } : row)));
  }

  function optionsFor(row: CheckRow) {
    const taken = new Set(rows.filter((item) => item.key !== row.key && item.checkId).map((item) => item.checkId));
    return allChecks.filter((option) => option.value === row.checkId || !taken.has(option.value));
  }

  function submit() {
    if (!personId) {
      toast.error('شخص را انتخاب کنید');
      return;
    }
    if (usesCheck && !selectedIds.length) {
      toast.error('حداقل یک چک انتخاب کنید یا با + چک جدید ثبت کنید');
      return;
    }
    if (!cashValue && !appliedCheck && !Number(discount || 0) && credit <= 0) {
      toast.error('مبلغ نقد، چک، تخفیف یا نسیه را وارد کنید');
      return;
    }
    start(async () => {
      const payload: Record<string, unknown> = {
        _person: personId,
        _invoice: invoiceId || undefined,
        cash: cashValue,
        discount: Number(discount || 0),
        creditAmount: credit,
        checkAmount: appliedCheck,
        _checks: usesCheck ? selectedIds : [],
        _check: usesCheck ? selectedIds[0] : undefined,
      };
      const res = await createPayment(payload);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'پرداخت ثبت نشد');
        return;
      }
      toast.success(credit > 0 ? 'پرداخت ثبت شد و مانده به دفتر نسیه اضافه شد' : 'پرداخت ثبت شد');
      reset();
      onSaved?.();
    });
  }

  return (
    <div className="grid gap-3">
      <PriceSection
        label={payable ? 'باید بپردازید' : 'باید بپردازد'}
        value={remaining}
        description={
          <>
            جمع مبلغ: <Price value={total} />
          </>
        }
      />
      <Input
        label="تخفیف"
        type="number"
        min={0}
        value={discount}
        onChange={(e) => setDiscount(Number(e.target.value))}
      />
      <Select
        label="نحوه پرداخت"
        value={method}
        onChange={(v) => setMethod((String(v) as PayMethod) || 'cash')}
        options={Object.entries(PAY_METHODS).map(([value, label]) => ({ value, label }))}
      />
      {usesCash ? (
        <Input
          label="مبلغ نقد"
          type="number"
          min={0}
          value={cash}
          onChange={(e) => setCash(Number(e.target.value))}
        />
      ) : null}
      {usesCheck ? (
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div key={row.key} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Select
                  label={index === 0 ? 'چک' : `چک ${index + 1}`}
                  value={row.checkId}
                  onChange={(v) => setRow(row.key, String(v ?? ''))}
                  options={optionsFor(row)}
                  searchable
                  placeholder="از چک‌های ثبت‌شده انتخاب کنید"
                  labels={selectLabels}
                />
              </div>
              <IconButton
                type="button"
                variant="outline"
                size="sm"
                className="mb-1"
                aria-label="ثبت چک جدید"
                disabled={!personId}
                onClick={() => {
                  if (!personId) {
                    toast.error('شخص را انتخاب کنید');
                    return;
                  }
                  setModalFor(row.key);
                }}
              >
                <Plus className="h-4 w-4" />
              </IconButton>
              <IconButton
                type="button"
                variant="outline"
                size="sm"
                className="mb-1"
                aria-label="حذف چک"
                disabled={rows.length <= 1}
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
              >
                <Minus className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setRows((current) => [...current, emptyRow()])}
          >
            افزودن چک دیگر
          </Button>
        </div>
      ) : null}
      <PriceSection
        label={payable ? 'مانده بدهی شما' : 'مانده نسیه (دفتر)'}
        value={credit}
        description={
          <>
            جمع نقد و چک و تخفیف: <Price value={cashValue + appliedCheck + Number(discount || 0)} />
            {method === 'credit' && !payable ? (
              <span className="mt-1 block">این مانده مثل دفتر نسیه قدیم برای مشتری ثبت می‌شود.</span>
            ) : null}
          </>
        }
      />
      <Button onClick={submit} disabled={pending || !personId}>
        ثبت پرداخت
      </Button>
      <CheckCreateModal
        open={Boolean(modalFor)}
        personId={personId}
        direction={payable ? 'out' : 'in'}
        onClose={() => setModalFor(null)}
        onCreated={(option) => {
          setExtraChecks((current) => [...current.filter((item) => item.value !== option.value), option]);
          if (modalFor) setRow(modalFor, option.value);
          setModalFor(null);
        }}
      />
    </div>
  );
}

function CheckCreateModal({
  open,
  personId,
  direction,
  onClose,
  onCreated,
}: {
  open: boolean;
  personId: string;
  direction: 'in' | 'out';
  onClose: () => void;
  onCreated: (option: FieldOption) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [series, setSeries] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [sayadiNumber, setSayadiNumber] = useState('');
  const [pending, start] = useTransition();

  function reset() {
    setAmount(0);
    setDueDate('');
    setSeries('');
    setSerialNumber('');
    setSayadiNumber('');
  }

  function submit() {
    if (!personId || !amount || !dueDate) {
      toast.error('مبلغ و سررسید چک الزامی است');
      return;
    }
    start(async () => {
      const res = await createReceivedCheck({
        _owner: personId,
        direction,
        amount: Number(amount),
        dueDate,
        series: series.trim() || undefined,
        serialNumber: serialNumber ? Number(serialNumber) : undefined,
        sayadiNumber: sayadiNumber ? Number(sayadiNumber) : undefined,
      });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        toast.error(res.message || 'چک ثبت نشد');
        return;
      }
      toast.success(res.message || 'چک ثبت شد');
      onCreated(
        checkOption(
          res.data as {
            _id?: unknown;
            amount?: number;
            dueDate?: string;
            series?: string;
            serialNumber?: number;
          },
        ),
      );
      reset();
    });
  }

  return (
    <Modal isOpen={open} onClose={onClose} size="md" className="z-[1050]">
      <FormCard>
        <h3 className="mb-4 text-lg font-medium">ثبت چک جدید</h3>
        <p className="mb-3 text-sm text-gray-500">
          {direction === 'out'
            ? 'این چک به‌عنوان پرداخت به این شخص در جدول چک ذخیره می‌شود.'
            : 'این چک در جدول چک هم ذخیره می‌شود و برای همین ردیف انتخاب می‌شود.'}
        </p>
        <div className="grid gap-3">
          <PriceField label="مبلغ *" value={amount} onChange={setAmount} />
          <DatePicker
            label="سررسید *"
            value={dueDate || null}
            valueCalendar="persian"
            placeholderText="انتخاب سررسید"
            onChange={(v) => setDueDate(v || '')}
          />
          <div className="flex items-end gap-2" dir="ltr">
            <div className="w-24 shrink-0 sm:w-28">
              <Input label="سری" value={series} onChange={(e) => setSeries(e.target.value)} />
            </div>
            <span className="mb-2 select-none text-lg leading-none text-gray-400">-</span>
            <div className="min-w-0 flex-1">
              <Input
                label="سریال"
                type="number"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
          </div>
          <Input
            label="صیادی"
            type="number"
            value={sayadiNumber}
            onChange={(e) => setSayadiNumber(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              انصراف
            </Button>
            <Button onClick={submit} disabled={pending}>
              ذخیره چک
            </Button>
          </div>
        </div>
      </FormCard>
    </Modal>
  );
}
