export const MAX_PAGE_SIZE = 200;
export const MAX_PAGE = 500;
export const MAX_LIST_SCAN = 8000;

export function clampPage(page = 1, skip = 50) {
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(Number(skip)) || 50));
  const p = Math.min(MAX_PAGE, Math.max(1, Math.trunc(Number(page)) || 1));
  return { page: p, skip: size };
}
