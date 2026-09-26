import mongoose from 'mongoose';
import { db, dbEngine } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { ok, type ActionResult } from './result';
import { withWorkspace } from './workspace';
import type { RecentMenuSearch } from '@/lib/menu-search';

const MAX_RECENT = 5;

function M(): any {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  const s = String(value || '').trim();
  if (!s) return s;
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : s;
}

function toItems(row: any): RecentMenuSearch[] {
  const list = Array.isArray(row?.items) ? row.items : [];
  return list.slice(0, MAX_RECENT).map((item: any) => ({
    query: String(item.query || ''),
    href: String(item.href || ''),
    label: String(item.label || ''),
    at: item.at ? new Date(item.at).toISOString() : new Date().toISOString(),
  }));
}

export async function getRecentMenuSearches(): Promise<ActionResult<{ items: RecentMenuSearch[] }>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<{ items: RecentMenuSearch[] }>;
  await db();
  const row =
    (await M().MenuSearch.findOne({ userId: oid(access.session._id) }).lean()) ||
    (await M().MenuSearch.findOne({ userId: access.session._id }).lean());
  return ok({ items: toItems(row) });
}

export async function recordMenuSearch(input: {
  query?: string;
  href?: string;
  label?: string;
}): Promise<ActionResult<{ items: RecentMenuSearch[] }>> {
  const access = await withWorkspace();
  if ('error' in access) return access.error as ActionResult<{ items: RecentMenuSearch[] }>;

  const query = String(input.query || '').trim().slice(0, 80);
  const href = String(input.href || '').trim();
  const label = String(input.label || '').trim().slice(0, 80);
  if (!query || !href.startsWith('/accounting/')) {
    return getRecentMenuSearches();
  }

  await db();
  const userKey = oid(access.session._id);
  const existing =
    (await M().MenuSearch.findOne({ userId: userKey }).lean()) ||
    (await M().MenuSearch.findOne({ userId: access.session._id }).lean());

  const next: RecentMenuSearch = {
    query,
    href,
    label: label || query,
    at: new Date().toISOString(),
  };
  const previous = toItems(existing).filter(
    (item) => !(item.href === next.href && item.query === next.query),
  );
  const items = [next, ...previous].slice(0, MAX_RECENT);

  if (existing?._id) {
    await M().MenuSearch.updateOne({ _id: existing._id }, { userId: userKey, items });
  } else {
    await M().MenuSearch.create({ userId: userKey, items });
  }

  return ok({ items });
}
