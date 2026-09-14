'use server';

import { listResource as listByName } from '@/server/domain';
import type { FieldOption } from '@/lib/types';

function relationId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'object') {
    const nested = (value as Record<string, unknown>)._id;
    return nested ? String(nested) : undefined;
  }
  return String(value);
}

function toOptions(data: unknown, labelKey: string, parentKey?: string): FieldOption[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const parent = parentKey ? relationId(row[parentKey]) : undefined;
    return {
      value: String(row._id),
      label: String(row[labelKey] ?? '').trim() || String(row._id),
      ...(parent ? { parent } : {}),
    };
  });
}

export async function personOptions(role?: string): Promise<FieldOption[]> {
  const extra = role ? `filter=${encodeURIComponent(JSON.stringify({ role }))}` : '';
  const res = await listByName('person', 1, 500, extra);
  return toOptions(res.data, 'fullName');
}

export async function clothOptions(): Promise<FieldOption[]> {
  const res = await listByName('cloth', 1, 500);
  return toOptions(res.data, 'code');
}

export async function colorOptions(): Promise<FieldOption[]> {
  const res = await listByName('color', 1, 200);
  return toOptions(res.data, 'name');
}

export async function clothKindOptions(): Promise<FieldOption[]> {
  const res = await listByName('cloth-kind', 1, 200);
  return toOptions(res.data, 'name');
}

export async function sizeOptions(): Promise<FieldOption[]> {
  const res = await listByName('size', 1, 200);
  return toOptions(res.data, 'name', '_clothKind');
}
