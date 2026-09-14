'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { BasicTable, Button, Input, Modal, FormCard, EmptyState, Select, Textarea } from '@/ui';
import { createResource, deleteResource, updateResource } from '@/actions/crud';

import { displayName, faDate, toman } from '@/lib/format';
import { PERSON_ROLES } from '@/lib/constants';
import type { FieldOption } from '@/lib/types';

export type { FieldOption };

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'relation';
  options?: FieldOption[];
  /** Name of another field whose value narrows this field's options, matched against `option.parent`. */
  dependsOn?: string;
  required?: boolean;
  searchable?: boolean;
  /** When set, this numeric field is multiplied by `option.price` of the named relation field. */
  priceFrom?: string;
  /** Show this field only when another field's value is one of `values`. */
  visibleWhen?: { field: string; values: string[] };
};

export type ColumnSpec = {
  header: string;
  accessor: string;
  format?: 'text' | 'name' | 'toman' | 'date' | 'role';
};

export function ResourceCrud({
  resource,
  title,
  rows,
  columns,
  fields,
  reload,
}: {
  resource: string;
  title: string;
  rows: Record<string, any>[];
  columns: ColumnSpec[];
  fields: Field[];
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [pending, start] = useTransition();

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<any>();
    const defs: ColumnDef<any, any>[] = columns.map((col) =>
      helper.accessor(col.accessor, {
        header: col.header,
        cell: (info) => {
          const row = info.row.original;
          const value = info.getValue();
          if (col.format === 'name') return displayName(value);
          if (col.format === 'toman') return value == null || value === '' ? '—' : toman(value);
          if (col.format === 'date') return faDate(value);
          if (col.format === 'role') return PERSON_ROLES[String(row.role)] || String(row.role ?? '—');
          return String(value ?? '—');
        },
      }),
    );
    defs.push(
      helper.display({
        id: 'actions',
        header: 'عملیات',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(row.original);
                const next: Record<string, string> = {};
                fields.forEach((f) => {
                  const value = row.original[f.name];
                  next[f.name] =
                    value && typeof value === 'object' ? String(value._id || '') : String(value ?? '');
                });
                setForm(next);
                setShowErrors(false);
                setOpen(true);
              }}
            >
              ویرایش
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                start(async () => {
                  const res = await deleteResource(resource, row.original._id);
                  setMessage(res.message);
                  reload();
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
  }, [columns, fields, resource, reload]);

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row._id),
  });

  /** Options visible for a field, narrowed to the current value of its parent field.
   *  Options with no parent are unassigned and stay available everywhere. */
  function optionsFor(field: Field): FieldOption[] {
    const all = field.options || [];
    if (!field.dependsOn) return all;
    const parentValue = form[field.dependsOn];
    if (!parentValue) return [];
    return all.filter((option) => !option.parent || option.parent === parentValue);
  }

  function setValue(field: Field, value: string) {
    setForm((s) => {
      if (s[field.name] === value) return s;
      const next = { ...s, [field.name]: value };
      fields.forEach((f) => {
        if (f.dependsOn === field.name) next[f.name] = '';
        if (f.visibleWhen?.field === field.name && !f.visibleWhen.values.includes(value)) {
          next[f.name] = '';
        }
      });
      return next;
    });
  }

  function isVisible(field: Field) {
    if (!field.visibleWhen) return true;
    return field.visibleWhen.values.includes(String(form[field.visibleWhen.field] ?? ''));
  }

  function missingFor(field: Field) {
    if (!isVisible(field)) return false;
    return Boolean(field.required) && !String(form[field.name] ?? '').trim();
  }

  function computedPrice() {
    const amountField = fields.find((f) => f.priceFrom);
    if (!amountField?.priceFrom) return null;
    const fabricField = fields.find((f) => f.name === amountField.priceFrom);
    const selected = (fabricField?.options || []).find((option) => option.value === form[amountField.priceFrom!]);
    const amount = Number(form[amountField.name] || 0);
    if (!selected || !amount) return 0;
    return amount * Number(selected.price || 0);
  }

  function submit() {
    const missing = fields.filter(missingFor);
    if (missing.length) {
      setShowErrors(true);
      setMessage(`تکمیل این موارد الزامی است: ${missing.map((f) => f.label).join('، ')}`);
      return;
    }
    setShowErrors(false);
    start(async () => {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (!isVisible(f)) return;
        payload[f.name] = f.type === 'number' ? Number(form[f.name]) : form[f.name];
      });
      const res = editing
        ? await updateResource(resource, editing._id, payload)
        : await createResource(resource, payload);
      setMessage(res.message || (res.ok ? 'ثبت شد' : 'خطا'));
      if (res.ok) {
        setOpen(false);
        setEditing(null);
        reload();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setForm({});
            setShowErrors(false);
            setOpen(true);
          }}
        >
          ثبت {title}
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {rows.length ? (
        <BasicTable table={table} isLoading={pending} labels={{ nothingToShow: 'موردی نیست' }} />
      ) : (
        <EmptyState message={`هنوز ${title} ثبت نشده`} />
      )}
      <Modal isOpen={open} onClose={() => setOpen(false)} size="lg">
        <FormCard>
          <h3 className="mb-4 text-lg font-medium">{editing ? `ویرایش ${title}` : `ثبت ${title}`}</h3>
          <div className="grid gap-3">
            {fields.map((field) => {
              if (!isVisible(field)) return null;
              const label = field.required ? `${field.label} *` : field.label;
              const error = showErrors && missingFor(field) ? 'الزامی است' : undefined;

              if (field.type === 'select' || field.type === 'relation') {
                const waitingOnParent = Boolean(field.dependsOn) && !form[field.dependsOn!];
                const parentLabel = fields.find((f) => f.name === field.dependsOn)?.label;
                return (
                  <Select
                    key={field.name}
                    label={label}
                    error={error}
                    value={form[field.name] || ''}
                    onChange={(v) => setValue(field, String(v ?? ''))}
                    options={optionsFor(field)}
                    searchable={field.searchable ?? field.type === 'relation'}
                    clearable={!field.required}
                    disabled={waitingOnParent}
                    placeholder="انتخاب کنید"
                    hint={waitingOnParent ? `ابتدا ${parentLabel} را انتخاب کنید` : undefined}
                    labels={{ search: 'جستجو', remove: 'حذف انتخاب', noOptionsFound: 'موردی یافت نشد' }}
                  />
                );
              }

              if (field.type === 'textarea') {
                return (
                  <Textarea
                    key={field.name}
                    label={label}
                    error={error}
                    value={form[field.name] || ''}
                    onChange={(e) => setValue(field, e.target.value)}
                  />
                );
              }

              return (
                <Input
                  key={field.name}
                  label={label}
                  error={error}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={form[field.name] || ''}
                  onChange={(e) => setValue(field, e.target.value)}
                />
              );
            })}
            {fields.find((f) => f.priceFrom) ? (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium">
                قیمت هر لباس: {toman(computedPrice() || 0)}
              </p>
            ) : null}
            <Button onClick={submit} disabled={pending}>
              ذخیره
            </Button>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}
