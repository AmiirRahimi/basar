import { NextResponse } from 'next/server';
import { tickerItems } from '@/lib/market-prices';
import { readPublicMarketPrices } from '@/server/market-prices';
import { getSession } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Cached prices only. External APIs are read by the background worker, not by this request. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] }, { status: 401 });
  const prices = await readPublicMarketPrices();
  return NextResponse.json(
    { items: tickerItems(prices) },
    { headers: { 'cache-control': 'private, max-age=5' } },
  );
}
