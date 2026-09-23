'use server';

import { getRecentMenuSearches as getRecent, recordMenuSearch as record } from '@/server/menu-search';

export async function getRecentMenuSearches() {
  return getRecent();
}

export async function recordMenuSearch(payload: { query?: string; href?: string; label?: string }) {
  return record(payload);
}
