'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  type ColumnDef,
} from '@tanstack/react-table';
import { BasicTable, Button, Input, Modal, FormCard, EmptyState, Select } from '@/ui';
import { createResource, deleteResource, updateResource } from '@/actions/crud';

import { displayName, faDate, toman } from '@/lib/format';
import { PERSON_ROLES } from '@/lib/constants';

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  options?: { label: string; value: string }[];
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
          if (col.format === 'toman') return toman(value);
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

  function submit() {
    start(async () => {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
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
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <FormCard>
          <h3 className="mb-4 text-lg font-medium">{editing ? `ویرایش ${title}` : `ثبت ${title}`}</h3>
          <div className="grid gap-3">
            {fields.map((field) =>
              field.type === 'select' ? (
                <Select
                  key={field.name}
                  label={field.label}
                  value={form[field.name] || ''}
                  onChange={(v: any) => setForm((s) => ({ ...s, [field.name]: String(v) }))}
                  options={field.options || []}
                />
              ) : (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={form[field.name] || ''}
                  onChange={(e) => setForm((s) => ({ ...s, [field.name]: e.target.value }))}
                />
              ),
            )}
            <Button onClick={submit} disabled={pending}>
              ذخیره
            </Button>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}
