'use client';

import { useMemo, useState, useTransition } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Button, Checkbox, CollapsiblePanel, FieldGroup, HintPopover, Input, Modal, FormCard, Select, Textarea, toast, cn } from '@/ui';
import { ChevronDown, Scissors, ShoppingBag } from 'lucide-react';
import { createResource, deleteResource, updateResource } from '@/actions/crud';
import { recordViewPath } from '@/lib/record-view';
import { RowActions } from './RowActions';
import { Price, PriceField, PriceSection } from './Price';
import { PersonRolePicker } from './PersonRolePicker';

import { displayName, faDate, parseGroupedNumber, toman } from '@/lib/format';
import { normalizePersonRoles, personRolesLabel } from '@/lib/constants';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { ClothImagesEditor } from './ClothImagesEditor';
import { ClothPacksEditor } from './ClothPacksEditor';
import { ClothShareFields } from './ClothShareFields';
import { ClothExtrasEditor } from './ClothExtrasEditor';
import { SearchableTable } from './SearchableTable';
import { AddPlusButton, usePageAddButton } from './PageAction';
import { useWritable } from './useWritable';
import {
  encodePacksEditorValue,
  mergePacks,
  parsePacksEditorValue,
  packsFromCloth,
  totalItems,
  validatePacksEditor,
} from '@/lib/packs';
import { clothExtrasTotal, encodeClothExtras, parseClothExtras, sanitizeClothExtras } from '@/lib/cloth-extras';
import {
  encodeFabricExtras,
  fabricExtrasTotal,
  parseFabricExtras,
  sanitizeFabricExtras,
} from '@/lib/fabric-extras';
import { clothImageLimitMessage, parseImageList } from '@/lib/shop-cart';
import type { FieldOption } from '@/lib/types';

export type { FieldOption };

export type VisibleWhen = { field: string; values: string[] };

export type Field = {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'number'
    | 'price'
    | 'select'
    | 'textarea'
    | 'relation'
    | 'packs'
    | 'extras'
    | 'boolean'
    | 'datetime'
    | 'images'
    | 'person-role'
    | 'cloth-share';
  options?: FieldOption[];
  storeOptions?: FieldOption[];
  defaultBrandId?: string;
  /** Kind options preset for `type: 'extras'` (default cloth). */
  extrasVariant?: 'cloth' | 'fabric';
  /** Name of another field whose value narrows this field's options, matched against `option.parent`. */
  dependsOn?: string;
  required?: boolean;
  searchable?: boolean;
  /** When set, this numeric field is multiplied by `option.price` of the named relation field. */
  priceFrom?: string;
  /** Show this field only when all rules match (single rule or AND list). */
  visibleWhen?: VisibleWhen | VisibleWhen[];
  /** Optional section title; consecutive fields with the same section render in one collapsible. */
  section?: string;
  /** Hover hint shown on the section toggle button. */
  sectionHint?: string;
  /** Optional visual group; consecutive fields with the same group share a bordered card. */
  group?: string;
  /** On md+ screens, place this field in a multi-column row inside its group. */
  row?: boolean;
};

function extrasHelpers(variant: Field['extrasVariant'] = 'cloth') {
  if (variant === 'fabric') {
    return {
      parse: parseFabricExtras,
      encode: encodeFabricExtras,
      sanitize: sanitizeFabricExtras,
      total: fabricExtrasTotal,
    };
  }
  return {
    parse: parseClothExtras,
    encode: encodeClothExtras,
    sanitize: sanitizeClothExtras,
    total: clothExtrasTotal,
  };
}

function visibleWhenRules(field: Field): VisibleWhen[] {
  if (!field.visibleWhen) return [];
  return Array.isArray(field.visibleWhen) ? field.visibleWhen : [field.visibleWhen];
}

function matchesVisibleWhen(rules: VisibleWhen[], values: Record<string, string>) {
  if (!rules.length) return true;
  return rules.every((rule) => {
    const current = String(values[rule.field] ?? '')
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!current.length) current.push('');
    return rule.values.some((wanted) => current.includes(wanted));
  });
}

export type ColumnSpec = {
  header: string;
  accessor: string;
  format?: 'text' | 'name' | 'toman' | 'date' | 'role';
};

function toDateTimeLocal(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ResourceCrud({
  resource,
  title,
  rows,
  columns,
  fields,
  reload,
  defaults,
  allowWrite = true,
  heading,
  headingDescription,
  headerAction = 'page',
}: {
  resource: string;
  title: string;
  rows: Record<string, any>[];
  columns: ColumnSpec[];
  fields: Field[];
  reload: () => void;
  defaults?: Record<string, string>;
  allowWrite?: boolean;
  heading?: string;
  headingDescription?: string;
  headerAction?: 'page' | 'local';
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [pending, start] = useTransition();
  const subscriptionWritable = useWritable();
  const writable = allowWrite && subscriptionWritable;

  function openCreate() {
    setEditing(null);
    const next: Record<string, string> = { ...(defaults || {}) };
    fields.forEach((f) => {
      if (f.type === 'boolean' && next[f.name] == null) {
        next[f.name] = f.name === 'isProduced' ? '' : 'false';
      }
      if (f.type === 'cloth-share') {
        if (next.sellInAllStores == null) next.sellInAllStores = 'false';
        if (next._brandIds == null) next._brandIds = f.defaultBrandId || '';
        if (next._storeIds == null) next._storeIds = '';
      }
    });
    setForm(next);
    setShowErrors(false);
    setOpen(true);
  }

  usePageAddButton({
    label: `ثبت ${title}`,
    onClick: openCreate,
    enabled: writable && headerAction === 'page',
  });

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<any>();
    const defs: ColumnDef<any, any>[] = columns.map((col) =>
      helper.accessor(col.accessor, {
        header: col.header,
        cell: (info) => {
          const row = info.row.original;
          const value = info.getValue();
          if (col.format === 'name') return displayName(value);
          if (col.format === 'toman') return value == null || value === '' ? '—' : <Price value={value} />;
          if (col.format === 'date') return faDate(value);
          if (col.format === 'role') return personRolesLabel(row.role) || '—';
          return String(value ?? '—');
        },
      }),
    );
    defs.push(
      helper.display({
        id: 'actions',
        header: 'عملیات',
        size: writable ? 148 : 72,
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            viewUrl={recordViewPath(resource, String(row.original._id))}
            onEdit={
              writable
                ? () => {
                    setEditing(row.original);
                    const next: Record<string, string> = {};
                    fields.forEach((f) => {
                      const value = row.original[f.name];
                      if (f.type === 'packs') {
                        next[f.name] = encodePacksEditorValue(packsFromCloth(row.original));
                        return;
                      }
                      if (f.type === 'extras') {
                        const helpers = extrasHelpers(f.extrasVariant);
                        next[f.name] = helpers.encode(helpers.parse(value) as never);
                        return;
                      }
                      if (f.type === 'person-role') {
                        next[f.name] = normalizePersonRoles(value).join(',');
                        return;
                      }
                      if (f.type === 'boolean') {
                        if (f.name === 'isProduced' && (value === undefined || value === null || value === '')) {
                          next[f.name] =
                            row.original._producedFrom || row.original._tailor ? 'true' : 'false';
                          return;
                        }
                        next[f.name] = value === true || value === 'true' || value === 1 || value === '1' ? 'true' : 'false';
                        return;
                      }
                      if (f.type === 'datetime') {
                        next[f.name] = toDateTimeLocal(value);
                        return;
                      }
                      if (f.type === 'cloth-share') {
                        const brands = Array.isArray(row.original._brandIds)
                          ? row.original._brandIds.map((item: unknown) =>
                              item && typeof item === 'object' && item && '_id' in item
                                ? String((item as { _id: unknown })._id)
                                : String(item || ''),
                            )
                          : String(row.original._brandId?._id || row.original._brandId || '')
                            ? [String(row.original._brandId?._id || row.original._brandId)]
                            : [];
                        const stores = Array.isArray(row.original._storeIds)
                          ? row.original._storeIds.map((item: unknown) =>
                              item && typeof item === 'object' && item && '_id' in item
                                ? String((item as { _id: unknown })._id)
                                : String(item || ''),
                            )
                          : [];
                        const sellAll = Boolean(row.original.sellInAllStores);
                        next.sellInAllStores = sellAll ? 'true' : 'false';
                        next._brandIds = (sellAll ? (f.options || []).map((option) => String(option.value)) : brands.filter(Boolean)).join(
                          ',',
                        );
                        next._storeIds = sellAll ? '' : stores.filter(Boolean).join(',');
                        return;
                      }
                      next[f.name] =
                        Array.isArray(value)
                          ? value.filter(Boolean).join('\n')
                          : value && typeof value === 'object'
                            ? String(value._id || '')
                            : String(value ?? '');
                    });
                    setForm(next);
                    setShowErrors(false);
                    setOpen(true);
                  }
                : undefined
            }
            onDelete={
              writable
                ? async () => {
                    const res = await deleteResource(resource, row.original._id);
                    if (redirectIfUnauthorized(res)) return;
                    if (res.ok) toast.success(res.message || 'حذف شد');
                    else toast.error(res.message || 'حذف نشد');
                    reload();
                  }
                : undefined
            }
          />
        ),
      }),
    );
    return defs;
  }, [writable, columns, fields, resource, reload]);

  function extraSearch(row: Record<string, any>) {
    return columns
      .map((col) => {
        const value = row[col.accessor];
        if (col.format === 'name') return displayName(value);
        if (col.format === 'toman') return value == null || value === '' ? '' : toman(value);
        if (col.format === 'date') return faDate(value);
        if (col.format === 'role') return personRolesLabel(row.role);
        return String(value ?? '');
      })
      .join(' ');
  }

  /** Options visible for a field, narrowed to the current value of its parent field.
   *  Options with no parent are unassigned and stay available everywhere. */
  function optionsFor(field: Field): FieldOption[] {
    const all = field.options || [];
    if (!field.dependsOn) return all;
    const parentValue = form[field.dependsOn];
    if (!parentValue) return [];
    const parents = parentValue
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return all.filter((option) => !option.parent || parents.includes(String(option.parent)));
  }

  function setValue(field: Field, value: string) {
    setForm((s) => {
      if (s[field.name] === value) return s;
      const next = { ...s, [field.name]: value };
      fields.forEach((f) => {
        if (f.dependsOn === field.name) next[f.name] = '';
        const rules = visibleWhenRules(f);
        if (!rules.some((rule) => rule.field === field.name)) return;
        if (!matchesVisibleWhen(rules, next)) {
          next[f.name] = f.type === 'boolean' ? 'false' : '';
        }
      });
      return next;
    });
  }

  function isVisible(field: Field) {
    return matchesVisibleWhen(visibleWhenRules(field), form);
  }

  function clearHiddenValue(field: Field) {
    if (field.type === 'images') return [];
    if (field.type === 'boolean') return false;
    if (field.type === 'number' || field.type === 'price' || field.type === 'relation' || field.type === 'datetime') {
      return null;
    }
    return '';
  }

  function missingFor(field: Field) {
    if (!isVisible(field)) return false;
    if (field.type === 'packs') {
      return Boolean(field.required) && Boolean(validatePacksEditor(parsePacksEditorValue(form[field.name])));
    }
    if (field.type === 'images') {
      return Boolean(clothImageLimitMessage(parseImageList(form[field.name]).length));
    }
    if (field.type === 'person-role') {
      return Boolean(field.required) && normalizePersonRoles(form[field.name]).length === 0;
    }
    if (field.type === 'cloth-share') {
      if (form.sellInAllStores === 'true') return false;
      return !String(form._brandIds || '').trim();
    }
    return Boolean(field.required) && !String(form[field.name] ?? '').trim();
  }

  function computedPrice() {
    const amountField = fields.find((f) => f.priceFrom);
    if (amountField?.priceFrom) {
      const fabricField = fields.find((f) => f.name === amountField.priceFrom);
      const selected = (fabricField?.options || []).find((option) => option.value === form[amountField.priceFrom!]);
      const amount = Number(form[amountField.name] || 0);
      if (!selected || !amount) return 0;
      return amount * Number(selected.price || 0);
    }
    return null;
  }

  /** Final per-item cost for cloth create/edit (produced or bought). */
  function finishedClothPrice(): number {
    const extras = clothExtrasTotal(form.extras);
    const mode = String(form.isProduced ?? '');
    if (mode === 'true') {
      return (
        Number(computedPrice() || 0) +
        Number(form.tailorFee || 0) +
        Number(form.washFee || 0) +
        Number(form.trimFee || 0) +
        Number(form.printFee || 0) +
        extras
      );
    }
    if (mode === 'false') {
      return Number(form.boughtFee || 0) + extras;
    }
    return extras;
  }

  function finishedClothDescription() {
    const mode = String(form.isProduced ?? '');
    if (mode === 'true') return 'پارچه + اجرت‌ها + خرج‌های اضافه';
    if (mode === 'false') return 'قیمت خرید یا موجودی قبلی + خرج‌های اضافه';
    return 'ابتدا تولید یا خرید / موجودی قبلی را انتخاب کنید';
  }

  function fabricLotComputed() {
    const hasLotFields =
      fields.some((f) => f.name === 'amount') &&
      fields.some((f) => f.name === 'priceForUnit') &&
      fields.some((f) => f.name === 'priceForShipingForUnit');
    if (!hasLotFields) return null;
    const amount = Number(form.amount || 0);
    const unit = Number(form.priceForUnit || 0);
    const shipping = Number(form.priceForShipingForUnit || 0);
    const discount = Number(form.discount || 0);
    const extrasField = fields.find((f) => f.type === 'extras' && f.extrasVariant === 'fabric');
    const extras = extrasField ? fabricExtrasTotal(form[extrasField.name] ?? form.extras) : fabricExtrasTotal(form.extras);
    return Math.max(0, amount * unit + amount * shipping - discount + extras);
  }

  function submit() {
    const missing = fields.filter(missingFor);
    if (missing.length) {
      setShowErrors(true);
      const packField = missing.find((f) => f.type === 'packs');
      const imagesField = missing.find((f) => f.type === 'images');
      const packError = packField ? validatePacksEditor(parsePacksEditorValue(form[packField.name])) : null;
      const imagesError = imagesField
        ? clothImageLimitMessage(parseImageList(form[imagesField.name]).length)
        : null;
      toast.error(packError || imagesError || `تکمیل این موارد الزامی است: ${missing.map((f) => f.label).join('، ')}`);
      return;
    }
    setShowErrors(false);
    start(async () => {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        if (!isVisible(f)) {
          if (f.visibleWhen) payload[f.name] = clearHiddenValue(f);
          return;
        }
        if (f.type === 'packs') {
          const parsed = parsePacksEditorValue(form[f.name]);
          payload.packSize = parsed.packSize;
          payload.packs = mergePacks(parsed.packs);
          payload.count = totalItems(mergePacks(parsed.packs));
          return;
        }
        if (f.type === 'extras') {
          payload[f.name] = extrasHelpers(f.extrasVariant).sanitize(form[f.name]);
          return;
        }
        if (f.type === 'person-role') {
          payload[f.name] = normalizePersonRoles(form[f.name]);
          return;
        }
        if (f.type === 'cloth-share') {
          payload.sellInAllStores = form.sellInAllStores === 'true';
          payload._brandIds = String(form._brandIds || '')
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
          payload._storeIds = String(form._storeIds || '')
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
          return;
        }
        if (f.type === 'boolean') {
          payload[f.name] = form[f.name] === 'true';
          return;
        }
        if (f.type === 'datetime') {
          payload[f.name] = form[f.name] || null;
          return;
        }
        if (f.type === 'images') {
          payload[f.name] = parseImageList(form[f.name]);
          return;
        }
        payload[f.name] =
          f.type === 'number' || f.type === 'price' ? parseGroupedNumber(form[f.name]) : form[f.name];
      });
      const res = editing
        ? await updateResource(resource, editing._id, payload)
        : await createResource(resource, payload);
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'ثبت شد');
        setOpen(false);
        setEditing(null);
        reload();
      } else {
        toast.error(res.message || 'ثبت نشد');
      }
    });
  }

  function renderField(field: Field) {
    const label = field.required ? `${field.label} *` : field.label;
    const error = showErrors && missingFor(field) ? 'الزامی است' : undefined;

    if (field.type === 'select' || field.type === 'relation') {
      const waitingOnParent = Boolean(field.dependsOn) && !form[field.dependsOn!];
      const parentLabel = fields.find((f) => f.name === field.dependsOn)?.label;
      return (
        <Select
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

    if (field.type === 'packs') {
      const packsError = showErrors ? validatePacksEditor(parsePacksEditorValue(form[field.name])) : undefined;
      return (
        <ClothPacksEditor
          label={label}
          value={form[field.name] || ''}
          onChange={(next) => setValue(field, next)}
          error={packsError || undefined}
        />
      );
    }

    if (field.type === 'extras') {
      return (
        <ClothExtrasEditor
          label={label}
          value={form[field.name] || ''}
          onChange={(next) => setValue(field, next)}
          variant={field.extrasVariant || 'cloth'}
        />
      );
    }

    if (field.type === 'boolean') {
      return (
        <Checkbox
          checked={form[field.name] === 'true'}
          onChange={() => setValue(field, form[field.name] === 'true' ? 'false' : 'true')}
          label={label}
        />
      );
    }

    if (field.type === 'person-role') {
      return (
        <PersonRolePicker
          label={field.label}
          value={form[field.name] || ''}
          required={field.required}
          error={error}
          onChange={(next) => setValue(field, next)}
        />
      );
    }

    if (field.type === 'cloth-share') {
      return (
        <ClothShareFields
          brandOptions={field.options || []}
          storeOptions={field.storeOptions || []}
          sellInAllStores={form.sellInAllStores === 'true'}
          brandIds={form._brandIds || ''}
          storeIds={form._storeIds || ''}
          defaultBrandId={field.defaultBrandId}
          error={error}
          disabled={!writable}
          onChange={(next) =>
            setForm((s) => ({
              ...s,
              sellInAllStores: next.sellInAllStores ? 'true' : 'false',
              _brandIds: next.brandIds,
              _storeIds: next.storeIds,
            }))
          }
        />
      );
    }

    if (field.type === 'datetime') {
      return (
        <Input
          label={label}
          error={error}
          type="datetime-local"
          value={form[field.name] || ''}
          onChange={(e) => setValue(field, e.target.value)}
        />
      );
    }

    if (field.type === 'images') {
      const imagesError = showErrors ? clothImageLimitMessage(parseImageList(form[field.name]).length) : undefined;
      return (
        <ClothImagesEditor
          label={label}
          value={form[field.name] || ''}
          onChange={(next) => setValue(field, next)}
          error={imagesError || undefined}
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <Textarea
          label={label}
          error={error}
          value={form[field.name] || ''}
          onChange={(e) => setValue(field, e.target.value)}
        />
      );
    }

    if (field.type === 'price') {
      return (
        <PriceField
          label={label}
          error={error}
          value={form[field.name] ?? ''}
          onChange={(next) => setValue(field, String(parseGroupedNumber(next)))}
        />
      );
    }

    return (
      <Input
        label={label}
        error={error}
        type={field.type === 'number' ? 'number' : 'text'}
        value={form[field.name] || ''}
        onChange={(e) => setValue(field, e.target.value)}
      />
    );
  }

  const sectionToggleNames = new Set(
    fields
      .filter((f) => f.section)
      .flatMap((f) => visibleWhenRules(f).map((rule) => rule.field))
      .filter((name) => {
        const toggle = fields.find((f) => f.name === name);
        return toggle?.type === 'boolean' && !toggle.section;
      }),
  );

  type SectionItem = { key: string; fields: Field[]; openValue: string; hint?: string };
  type FormBlock =
    | { kind: 'fields'; group?: string; row: boolean; fields: Field[] }
    | { kind: 'sections'; toggle: Field; sections: SectionItem[] };

  const formBlocks: FormBlock[] = [];
  for (let i = 0; i < fields.length; ) {
    const field = fields[i];

    if (sectionToggleNames.has(field.name) && field.type === 'boolean') {
      const toggle = field;
      const bySection = new Map<string, Field[]>();
      const hints = new Map<string, string>();
      const order: string[] = [];
      for (const f of fields) {
        const toggleRule = visibleWhenRules(f).find((rule) => rule.field === toggle.name);
        if (!f.section || !toggleRule) continue;
        if (!bySection.has(f.section)) {
          bySection.set(f.section, []);
          order.push(f.section);
        }
        bySection.get(f.section)!.push(f);
        if (f.sectionHint && !hints.has(f.section)) hints.set(f.section, f.sectionHint);
      }
      formBlocks.push({
        kind: 'sections',
        toggle,
        sections: order.map((key) => {
          const sectionFields = bySection.get(key)!;
          const toggleRule = visibleWhenRules(sectionFields[0]).find((rule) => rule.field === toggle.name);
          return {
            key,
            fields: sectionFields,
            openValue: String(toggleRule?.values[0] ?? ''),
            hint: hints.get(key),
          };
        }),
      });
      while (i < fields.length) {
        const f = fields[i];
        if (
          f.name === toggle.name ||
          (f.section && visibleWhenRules(f).some((rule) => rule.field === toggle.name))
        ) {
          i += 1;
          continue;
        }
        break;
      }
      continue;
    }

    if (field.section) {
      i += 1;
      continue;
    }

    if (field.group) {
      const groupName = field.group;
      const groupFields: Field[] = [];
      while (i < fields.length && fields[i].group === groupName) {
        const current = fields[i];
        if (!current.visibleWhen || isVisible(current)) groupFields.push(current);
        i += 1;
      }
      if (groupFields.length) {
        formBlocks.push({
          kind: 'fields',
          group: groupName,
          row: groupFields.some((f) => f.row),
          fields: groupFields,
        });
      }
      continue;
    }

    if (!isVisible(field)) {
      i += 1;
      continue;
    }
    formBlocks.push({ kind: 'fields', row: false, fields: [field] });
    i += 1;
  }

  function sectionButtonClass(active: boolean) {
    return cn(
      'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium shadow-sm backdrop-blur-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
      active
        ? 'border-primary/40 bg-primary/10 text-primary shadow-primary/10 hover:border-primary/50 hover:bg-primary/15'
        : 'border-gray-200/80 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-800 dark:border-gray-700/50 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100',
    );
  }

  return (
    <div className="space-y-4">
      {heading || headingDescription || (writable && headerAction === 'local') ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            {heading ? <h3 className="font-medium">{heading}</h3> : null}
            {headingDescription ? <p className="mt-1 text-sm text-muted-foreground">{headingDescription}</p> : null}
          </div>
          {writable && headerAction === 'local' ? (
            <AddPlusButton label={`ثبت ${title}`} onClick={openCreate} />
          ) : null}
        </div>
      ) : null}
      <SearchableTable
        storageKey={resource}
        resource={resource}
        data={rows}
        columns={tableColumns}
        getRowId={(row) => String(row._id)}
        extraSearch={extraSearch}
        isLoading={pending}
        emptyMessage={`هنوز ${title} ثبت نشده`}
      />
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        size={fields.some((field) => field.type === 'packs' || field.type === 'extras') ? 'xl' : 'lg'}
        title={editing ? `ویرایش ${title}` : `ثبت ${title}`}
      >
        <FormCard className="border-0 shadow-none rounded-[inherit]">
          <div className="grid min-w-0 gap-3">
            {formBlocks.map((block) => {
              if (block.kind === 'fields') {
                const body = (
                  <div
                    className={cn(
                      'grid gap-3',
                      block.row
                        ? block.fields.length >= 4
                          ? 'sm:grid-cols-2 xl:grid-cols-4'
                          : block.fields.length === 3
                            ? 'sm:grid-cols-2 lg:grid-cols-3'
                            : 'sm:grid-cols-2'
                        : undefined,
                    )}
                  >
                    {block.fields.map((field) => (
                      <div key={field.name} className="min-w-0 w-full">
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                );
                if (!block.group) {
                  return (
                    <div key={block.fields.map((f) => f.name).join('-')} className="grid gap-3">
                      {block.fields.map((field) => (
                        <div key={field.name} className="min-w-0 w-full">
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <FieldGroup key={block.group} title={block.group}>
                    {body}
                  </FieldGroup>
                );
              }

              const current = String(form[block.toggle.name] ?? '');
              return (
                <div key={block.toggle.name} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {block.sections.map((section) => {
                      const active = current === section.openValue;
                      const Icon = section.openValue === 'true' ? Scissors : ShoppingBag;
                      const button = (
                        <button
                          type="button"
                          onClick={() => setValue(block.toggle, active ? '' : section.openValue)}
                          aria-expanded={active}
                          className={sectionButtonClass(active)}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{section.key}</span>
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out',
                              active ? 'rotate-180' : 'rotate-0',
                            )}
                          />
                        </button>
                      );
                      return (
                        <div key={section.key} className="min-w-0">
                          <HintPopover content={section.hint}>{button}</HintPopover>
                        </div>
                      );
                    })}
                  </div>
                  {block.sections.map((section) => {
                    const openPanel = current === section.openValue;
                    const visibleFields = section.fields.filter(isVisible);
                    const chunks: { row: boolean; fields: Field[] }[] = [];
                    let fi = 0;
                    while (fi < visibleFields.length) {
                      const field = visibleFields[fi];
                      if (field.group && field.row) {
                        const groupName = field.group;
                        const groupFields: Field[] = [];
                        while (
                          fi < visibleFields.length &&
                          visibleFields[fi].group === groupName &&
                          visibleFields[fi].row
                        ) {
                          groupFields.push(visibleFields[fi]);
                          fi += 1;
                        }
                        chunks.push({ row: true, fields: groupFields });
                        continue;
                      }
                      chunks.push({ row: Boolean(field.row), fields: [field] });
                      fi += 1;
                    }
                    return (
                      <CollapsiblePanel
                        key={section.key}
                        open={openPanel}
                        panelKey={`section-${section.key}`}
                        contentClassName="space-y-3"
                      >
                        <div className="grid gap-3">
                          {chunks.map((chunk) => (
                            <div
                              key={chunk.fields.map((f) => f.name).join('-')}
                              className={cn(
                                'grid gap-3',
                                chunk.row
                                  ? chunk.fields.length >= 3
                                    ? 'sm:grid-cols-2 lg:grid-cols-3'
                                    : 'sm:grid-cols-2'
                                  : undefined,
                              )}
                            >
                              {chunk.fields.map((field) => (
                                <div key={field.name} className="min-w-0 w-full">
                                  {renderField(field)}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </CollapsiblePanel>
                    );
                  })}
                </div>
              );
            })}
            {fabricLotComputed() != null ? (
              <PriceSection label="مبلغ کل" value={fabricLotComputed() || 0} />
            ) : null}
            {fields.some((f) => f.name === 'isProduced') ? (
              <PriceSection
                label="قیمت تمام‌شده هر لباس"
                value={finishedClothPrice()}
                description={finishedClothDescription()}
              />
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
