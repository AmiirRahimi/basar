'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Button, FormCard, Input, Modal, Select, toast } from '@/ui';
import { createResource, deleteResource, updateResource } from '@/actions/crud';
import {
  CHECK_DIRECTIONS,
  CHECK_SOURCES,
  CHECK_STATUSES,
  checkAvailableToTransfer,
  checkSourceLabel,
  checkStatus,
} from '@/lib/checks';
import { displayName, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { RowActions } from './RowActions';
import { recordViewPath } from '@/lib/record-view';
import { SearchableTable } from './SearchableTable';
import { usePageAddButton } from './PageAction';
import { useWritable } from './useWritable';
import type { Check, FieldOption } from '@/lib/types';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

function relationId(value: unknown) {
  if (value == null || value === '') return '';
  if (typeof value === 'object' && value && '_id' in value) return String((value as { _id?: unknown })._id ?? '');
  return String(value);
}

export function ChecksCrud({ checks, people }: { checks: Check[]; people: FieldOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Check | null>(null);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [source, setSource] = useState<'own' | 'received'>('own');
  const [owner, setOwner] = useState('');
  const [sourceCheck, setSourceCheck] = useState('');
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [sayadiNumber, setSayadiNumber] = useState('');
  const [status, setStatus] = useState<'pending' | 'passed' | 'failed'>('pending');
  const [showErrors, setShowErrors] = useState(false);
  const [pending, start] = useTransition();
  const writable = useWritable();

  const transferable = useMemo(
    () =>
      checks
        .filter((row) => checkAvailableToTransfer(row) && (!editing || row._id !== editing._id))
        .map((row) => ({
          value: row._id,
          label: `${displayName(row._owner)} — ${toman(row.amount)} — ${row.dueDate || ''}`,
          price: Number(row.amount || 0),
        })),
    [checks, editing],
  );

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<Check>();
    const defs: ColumnDef<Check, any>[] = [
      helper.accessor((row) => row.direction, {
        id: 'direction',
        header: 'نوع',
        cell: (info) => CHECK_DIRECTIONS[info.getValue() === 'out' ? 'out' : 'in'],
      }),
      helper.accessor((row) => row._owner, {
        id: '_owner',
        header: 'شخص',
        cell: (info) => displayName(info.getValue()),
      }),
      helper.accessor((row) => row.amount, {
        id: 'amount',
        header: 'مبلغ',
        cell: (info) => toman(info.getValue()),
      }),
      helper.accessor((row) => row.dueDate, {
        id: 'dueDate',
        header: 'سررسید',
        cell: (info) => String(info.getValue() || '—'),
      }),
      helper.accessor((row) => (row.direction === 'out' ? checkSourceLabel(row) : ''), {
        id: 'source',
        header: 'منبع',
        cell: ({ row }) => (row.original.direction === 'out' ? checkSourceLabel(row.original) : '—'),
      }),
      helper.accessor((row) => checkStatus(row), {
        id: 'status',
        header: 'وضعیت',
        cell: ({ row }) => {
          const status = checkStatus(row.original);
          const color =
            status === 'failed' ? 'text-rose-600' : status === 'passed' ? 'text-emerald-600' : 'text-amber-600';
          return <span className={color}>{CHECK_STATUSES[status]}</span>;
        },
      }),
      helper.accessor((row) => row.serialNumber, {
        id: 'serialNumber',
        header: 'سریال',
        cell: (info) => String(info.getValue() || '—'),
      }),
      helper.accessor((row) => row.sayadiNumber, {
        id: 'sayadiNumber',
        header: 'صیادی',
        cell: (info) => String(info.getValue() || '—'),
      }),
      helper.accessor((row) => row.isTransferred, {
        id: 'isTransferred',
        header: 'واگذار شده',
        cell: (info) => (info.getValue() ? 'بله' : 'خیر'),
      }),
    ];
    defs.push(
      helper.display({
        id: 'actions',
        header: 'عملیات',
        size: writable ? 148 : 72,
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            viewUrl={recordViewPath('check', String(row.original._id))}
            onEdit={writable ? () => openEdit(row.original) : undefined}
            onDelete={
              writable
                ? async () => {
                    const res = await deleteResource('check', row.original._id);
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

  function extraSearch(row: Check) {
    const status = checkStatus(row);
    return [
      CHECK_DIRECTIONS[row.direction === 'out' ? 'out' : 'in'],
      CHECK_STATUSES[status],
      checkSourceLabel(row),
      displayName(row._owner),
      row.isTransferred ? 'بله واگذار شده' : 'خیر',
      toman(row.amount),
    ].join(' ');
  }

  function resetForm() {
    setEditing(null);
    setDirection('in');
    setSource('own');
    setOwner('');
    setSourceCheck('');
    setAmount(0);
    setDueDate('');
    setSerialNumber('');
    setSayadiNumber('');
    setStatus('pending');
    setShowErrors(false);
  }

  function openEdit(row: Check) {
    setEditing(row);
    setDirection(row.direction === 'out' ? 'out' : 'in');
    setSource(row._sourceCheck ? 'received' : 'own');
    setOwner(relationId(row._owner));
    setSourceCheck(relationId(row._sourceCheck));
    setAmount(Number(row.amount || 0));
    setDueDate(String(row.dueDate || ''));
    setSerialNumber(row.serialNumber != null ? String(row.serialNumber) : '');
    setSayadiNumber(row.sayadiNumber != null ? String(row.sayadiNumber) : '');
    setStatus(checkStatus(row));
    setShowErrors(false);
    setOpen(true);
  }

  function onSourceCheck(id: string) {
    setSourceCheck(id);
    const row = checks.find((item) => item._id === id);
    if (!row) return;
    setAmount(Number(row.amount || 0));
    setDueDate(String(row.dueDate || ''));
    setSerialNumber(row.serialNumber != null ? String(row.serialNumber) : '');
    setSayadiNumber(row.sayadiNumber != null ? String(row.sayadiNumber) : '');
  }

  function submit() {
    if (
      !owner ||
      !dueDate ||
      (direction === 'out' && source === 'received' && !sourceCheck) ||
      ((direction !== 'out' || source !== 'received') && !amount)
    ) {
      setShowErrors(true);
      toast.error('شخص، سررسید و مبلغ یا چک مبدأ را کامل کنید');
      return;
    }
    start(async () => {
      const payload: Record<string, unknown> = {
        direction,
        _owner: owner,
        amount: Number(amount || 0),
        dueDate,
        serialNumber: serialNumber ? Number(serialNumber) : undefined,
        sayadiNumber: sayadiNumber ? Number(sayadiNumber) : undefined,
        status,
        _sourceCheck: direction === 'out' && source === 'received' ? sourceCheck : undefined,
      };
      const res = editing
        ? await updateResource('check', editing._id, payload)
        : await createResource('check', payload);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ثبت نشد');
        return;
      }
      toast.success(res.message || 'ثبت شد');
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  usePageAddButton({
    label: 'ثبت چک',
    onClick: () => {
      resetForm();
      setOpen(true);
    },
    enabled: writable,
  });

  return (
    <div className="space-y-4">
      <SearchableTable
        storageKey="check"
        resource="check"
        data={checks}
        columns={tableColumns}
        getRowId={(row) => String(row._id)}
        extraSearch={extraSearch}
        isLoading={pending}
        emptyMessage="هنوز چکی ثبت نشده"
      />
      <Modal isOpen={open} onClose={() => setOpen(false)} size="lg">
        <FormCard>
          <h3 className="mb-4 text-lg font-medium">{editing ? 'ویرایش چک' : 'ثبت چک'}</h3>
          <div className="grid gap-3">
            <Select
              label="نوع *"
              value={direction}
              onChange={(v) => setDirection(String(v) === 'out' ? 'out' : 'in')}
              options={Object.entries(CHECK_DIRECTIONS).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label={direction === 'out' ? 'پرداخت به *' : 'دریافت از *'}
              error={showErrors && !owner ? 'الزامی است' : undefined}
              value={owner}
              onChange={(v) => setOwner(String(v ?? ''))}
              options={people}
              searchable
              placeholder="انتخاب کنید"
              labels={selectLabels}
            />
            {direction === 'out' ? (
              <Select
                label="منبع چک"
                value={source}
                onChange={(v) => setSource(String(v) === 'received' ? 'received' : 'own')}
                options={Object.entries(CHECK_SOURCES).map(([value, label]) => ({ value, label }))}
              />
            ) : null}
            {direction === 'out' && source === 'received' ? (
              <Select
                label="چک دریافتی *"
                error={showErrors && !sourceCheck ? 'الزامی است' : undefined}
                value={sourceCheck}
                onChange={(v) => onSourceCheck(String(v ?? ''))}
                options={transferable}
                searchable
                placeholder="انتخاب کنید"
                labels={selectLabels}
              />
            ) : null}
            <Input
              label="مبلغ *"
              type="number"
              min={0}
              value={amount}
              disabled={direction === 'out' && source === 'received'}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <Input
              label="سررسید (مثلاً 1404/06/24) *"
              value={dueDate}
              disabled={direction === 'out' && source === 'received'}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <Input
              label="سریال"
              type="number"
              value={serialNumber}
              disabled={direction === 'out' && source === 'received'}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
            <Input
              label="صیادی"
              type="number"
              value={sayadiNumber}
              disabled={direction === 'out' && source === 'received'}
              onChange={(e) => setSayadiNumber(e.target.value)}
            />
            <Select
              label="وضعیت"
              value={status}
              onChange={(v) => setStatus((String(v) as 'pending' | 'passed' | 'failed') || 'pending')}
              options={Object.entries(CHECK_STATUSES).map(([value, label]) => ({ value, label }))}
            />
            <Button onClick={submit} disabled={pending}>
              ذخیره
            </Button>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}
