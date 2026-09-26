'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Pencil, Plus, Ruler, Search, Shirt, SwatchBook, Trash2 } from 'lucide-react';
import { Button, DeleteConfirmationTrigger, IconButton, Input, Select, Tabs, toast } from '@/ui';
import { createResource, deleteResource, updateResource } from '@/actions/crud';
import { displayName } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { relationId } from '@/lib/record-view';
import { useWritable } from './useWritable';
import type { FieldOption } from '@/lib/types';

type ListRow = Record<string, any>;

type TabId = 'cloth-kind' | 'cloth-style' | 'color' | 'size';

const TABS: {
  id: TabId;
  label: string;
  hint: string;
  icon: typeof Shirt;
  needsKind: boolean;
}[] = [
  { id: 'cloth-kind', label: 'نوع لباس', hint: 'مثل شلوار جین یا شلوار کتان', icon: Shirt, needsKind: false },
  { id: 'cloth-style', label: 'مدل', hint: 'مدل‌های هر نوع، مثل راسته و مام', icon: SwatchBook, needsKind: true },
  { id: 'color', label: 'رنگ', hint: 'رنگ‌های قابل انتخاب روی لباس', icon: Palette, needsKind: false },
  { id: 'size', label: 'سایز', hint: 'سایزهای هر نوع لباس', icon: Ruler, needsKind: true },
];

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

function rowName(row: ListRow) {
  return String(row.name || '').trim();
}

export function DropdownsBoard({
  kinds,
  styles,
  colors,
  sizes,
  kindOptions,
}: {
  kinds: ListRow[];
  styles: ListRow[];
  colors: ListRow[];
  sizes: ListRow[];
  kindOptions: FieldOption[];
}) {
  const router = useRouter();
  const writable = useWritable();
  const [tab, setTab] = useState<TabId>('cloth-kind');
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [kindId, setKindId] = useState(kindOptions[0]?.value || '');
  const [editing, setEditing] = useState<ListRow | null>(null);
  const [pending, start] = useTransition();

  const active = TABS.find((item) => item.id === tab) || TABS[0];
  const rowsByTab: Record<TabId, ListRow[]> = {
    'cloth-kind': kinds,
    'cloth-style': styles,
    color: colors,
    size: sizes,
  };
  const rows = rowsByTab[tab];
  const needle = query.trim().toLowerCase();

  const visibleRows = useMemo(() => {
    if (!needle) return rows;
    return rows.filter((row) => {
      const kindName = displayName(row._clothKind);
      return `${rowName(row)} ${kindName}`.toLowerCase().includes(needle);
    });
  }, [needle, rows]);

  const grouped = useMemo(() => {
    if (!active.needsKind) return null;
    const groups = kinds.map((kind) => ({
      id: String(kind._id),
      title: rowName(kind) || 'بدون نام',
      items: visibleRows.filter((row) => relationId(row._clothKind) === String(kind._id)),
    }));
    const known = new Set(groups.map((group) => group.id));
    const orphan = visibleRows.filter((row) => !known.has(relationId(row._clothKind)));
    if (orphan.length) groups.push({ id: 'other', title: 'بدون نوع', items: orphan });
    return groups.filter((group) => group.items.length);
  }, [active.needsKind, kinds, visibleRows, needle]);

  function resetForm() {
    setEditing(null);
    setName('');
    setKindId(kindOptions[0]?.value || '');
  }

  function startEdit(row: ListRow) {
    setEditing(row);
    setName(rowName(row));
    setKindId(relationId(row._clothKind) || kindOptions[0]?.value || '');
  }

  function submit() {
    const nextName = name.trim();
    if (!nextName) {
      toast.error('نام را وارد کنید');
      return;
    }
    if (active.needsKind && !kindId) {
      toast.error('نوع لباس را انتخاب کنید');
      return;
    }
    const payload: Record<string, unknown> = { name: nextName };
    if (active.needsKind) payload._clothKind = kindId;
    start(async () => {
      const res = editing
        ? await updateResource(tab, editing._id, payload)
        : await createResource(tab, payload);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ثبت نشد');
        return;
      }
      toast.success(res.message || (editing ? 'ویرایش شد' : 'ثبت شد'));
      resetForm();
      router.refresh();
    });
  }

  async function remove(row: ListRow) {
    const res = await deleteResource(tab, row._id);
    if (redirectIfUnauthorized(res)) return;
    if (res.ok) {
      toast.success(res.message || 'حذف شد');
      if (editing?._id === row._id) resetForm();
      router.refresh();
    } else {
      toast.error(res.message || 'حذف نشد');
    }
  }

  return (
    <div className="flex max-h-[calc(100dvh-11rem)] min-h-[28rem] flex-col gap-4">
      <Tabs
        value={tab}
        onChange={(next) => {
          setTab(next as TabId);
          setQuery('');
          resetForm();
        }}
        tabs={TABS.map((item) => ({
          value: item.id,
          icon: <item.icon className="size-4" />,
          label: (
            <span className="inline-flex items-center gap-2">
              {item.label}
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[11px]">{rowsByTab[item.id].length}</span>
            </span>
          ),
        }))}
      />

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{active.label}</h2>
              <p className="mt-0.5 text-sm text-gray-500">{active.hint}</p>
            </div>
            <p className="shrink-0 text-xs text-gray-400">{visibleRows.length} مورد</p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <Input
                label="جستجو"
                icon={<Search className="size-4" />}
                placeholder={`جستجو در ${active.label}`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                fullWidth
              />
            </div>
            {writable ? (
              <form
                className="flex min-w-0 flex-[1.2] flex-col gap-2 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                {active.needsKind ? (
                  <div className="sm:w-44">
                    <Select
                      label={editing ? 'ویرایش' : 'افزودن'}
                      value={kindId}
                      onChange={(value) => setKindId(String(value ?? ''))}
                      options={kindOptions}
                      searchable
                      placeholder="نوع لباس"
                      labels={selectLabels}
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <Input
                    label={active.needsKind ? undefined : editing ? 'ویرایش' : 'افزودن'}
                    placeholder={`نام ${active.label}`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    fullWidth
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="md" loading={pending} icon={<Plus className="size-4" />}>
                    {editing ? 'ذخیره' : 'افزودن'}
                  </Button>
                  {editing ? (
                    <Button type="button" size="md" variant="outline" onClick={resetForm}>
                      انصراف
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {active.needsKind && !kinds.length ? (
            <div className="flex h-full min-h-40 items-center justify-center text-sm text-gray-500">
              ابتدا از زبانه «نوع لباس» یک نوع بسازید، بعد مدل و سایز اضافه کنید.
            </div>
          ) : !visibleRows.length ? (
            <div className="flex h-full min-h-40 items-center justify-center text-sm text-gray-500">
              {needle ? 'نتیجه‌ای برای این جستجو نیست' : `هنوز ${active.label} ثبت نشده`}
            </div>
          ) : grouped ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {grouped.map((group) => (
                <article key={group.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-800">{group.title}</h3>
                    <span className="text-xs text-gray-400">{group.items.length}</span>
                  </div>
                  {group.items.length ? (
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((row) => (
                        <ItemChip
                          key={row._id}
                          row={row}
                          writable={writable}
                          active={editing?._id === row._id}
                          onEdit={() => startEdit(row)}
                          onDelete={() => remove(row)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">موردی در این نوع نیست</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {visibleRows.map((row) => (
                <ItemChip
                  key={row._id}
                  row={row}
                  writable={writable}
                  active={editing?._id === row._id}
                  onEdit={() => startEdit(row)}
                  onDelete={() => remove(row)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ItemChip({
  row,
  writable,
  active,
  onEdit,
  onDelete,
}: {
  row: ListRow;
  writable: boolean;
  active?: boolean;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
}) {
  return (
    <div
      className={`group inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition ${
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
      }`}
    >
      <span className="truncate px-0.5">{rowName(row) || 'بدون نام'}</span>
      {writable ? (
        <span className="inline-flex items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <IconButton
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 text-gray-500 hover:text-amber-600"
            aria-label="ویرایش"
            onClick={onEdit}
          >
            <Pencil className="size-3" />
          </IconButton>
          <DeleteConfirmationTrigger
            item={row}
            onDelete={() => onDelete()}
            deleteIcon={<Trash2 className="size-3" />}
            title="حذف"
            description="این مورد حذف شود؟"
            tooltipLabel="حذف"
            dir="rtl"
            yesLabel="بله"
            noLabel="خیر"
          />
        </span>
      ) : null}
    </div>
  );
}
