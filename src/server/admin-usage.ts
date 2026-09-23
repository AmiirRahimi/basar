import { IMAGE_EDIT_TOKEN_COST, imageTokenPackById } from '@/lib/image-tokens';
import { PERSIAN_MONTHS, persianYearMonth } from '@/lib/checks';
import { requirePlatformAdmin } from './admin';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { ok, type ActionResult } from './result';
import { snapshotFromRow } from './subscription';

function M(): any {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function monthKey(value: unknown) {
  return persianYearMonth(value as string);
}

function shiftMonth(key: string, delta: number) {
  const [yearRaw, monthRaw] = key.split('/');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) return '';
  const idx = year * 12 + (month - 1) + delta;
  return `${Math.floor(idx / 12)}/${String((idx % 12) + 1).padStart(2, '0')}`;
}

function emptyMonths() {
  return PERSIAN_MONTHS.map((label) => ({ label, bought: 0, used: 0, revenue: 0, subscriptions: 0, subscriptionRevenue: 0 }));
}

export async function getAdminUsageReport(): Promise<ActionResult> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;
  await db();

  const [users, subscriptions, purchases, edits] = await Promise.all([
    M().User.find().select('_id fullName phonenumber imageTokens').lean(),
    M().UserSubscription.find().sort({ startDate: -1 }).lean(),
    M().ImageTokenPurchase.find().sort({ timeStamp: -1 }).lean(),
    M().ImageEdit.find().select('_id _userId timeStamp').lean(),
  ]);

  const userById = new Map<string, any>();
  for (const user of users as any[]) userById.set(String(user._id), user);

  const nowKey = monthKey(new Date());
  const lastKey = shiftMonth(nowKey, -1);
  const year = nowKey.slice(0, 4);
  const months = emptyMonths();

  const subscriptionRows = (subscriptions as any[]).map((row) => {
    const snap = snapshotFromRow(row);
    const user = userById.get(String(row._userId));
    const price = Number(row.price || 0);
    const key = monthKey(row.startDate);
    if (key.startsWith(`${year}/`)) {
      const index = Number(key.split('/')[1]) - 1;
      if (index >= 0 && index < 12) {
        months[index].subscriptions += 1;
        months[index].subscriptionRevenue += price;
      }
    }
    return {
      _id: String(row._id),
      fullName: user?.fullName || '',
      phonenumber: String(user?.phonenumber || ''),
      planName: snap.planName,
      billingCycle: snap.billingCycle,
      price,
      startDate: row.startDate,
      endDate: row.endDate,
      active: snap.active,
      remainingDays: snap.remainingDays || 0,
    };
  });

  const editsByUser = new Map<string, number>();
  for (const edit of edits as any[]) {
    const id = String(edit._userId || '');
    editsByUser.set(id, (editsByUser.get(id) || 0) + IMAGE_EDIT_TOKEN_COST);
    const key = monthKey(edit.timeStamp);
    if (key.startsWith(`${year}/`)) {
      const index = Number(key.split('/')[1]) - 1;
      if (index >= 0 && index < 12) months[index].used += IMAGE_EDIT_TOKEN_COST;
    }
  }

  const boughtByUser = new Map<string, { tokens: number; price: number; count: number; lastAt: string }>();
  const purchaseRows = (purchases as any[]).map((row) => {
    const userId = String(row._userId || '');
    const user = userById.get(userId);
    const tokens = Number(row.tokens || 0);
    const price = Number(row.price || 0);
    const pack = imageTokenPackById(row.packId);
    const current = boughtByUser.get(userId) || { tokens: 0, price: 0, count: 0, lastAt: '' };
    current.tokens += tokens;
    current.price += price;
    current.count += 1;
    const at = row.timeStamp ? new Date(row.timeStamp).toISOString() : '';
    if (!current.lastAt || at > current.lastAt) current.lastAt = at;
    boughtByUser.set(userId, current);
    const key = monthKey(row.timeStamp);
    if (key.startsWith(`${year}/`)) {
      const index = Number(key.split('/')[1]) - 1;
      if (index >= 0 && index < 12) {
        months[index].bought += tokens;
        months[index].revenue += price;
      }
    }
    return {
      _id: String(row._id),
      fullName: user?.fullName || '',
      phonenumber: String(user?.phonenumber || ''),
      packName: pack?.name || row.packId || 'بسته',
      tokens,
      price,
      timeStamp: row.timeStamp,
    };
  });

  const people = (users as any[])
    .map((user) => {
      const id = String(user._id);
      const bought = boughtByUser.get(id);
      const used = editsByUser.get(id) || 0;
      const balance = Number(user.imageTokens || 0);
      if (!bought && !used && !balance) return null;
      return {
        _id: id,
        fullName: user.fullName || '',
        phonenumber: String(user.phonenumber || ''),
        bought: bought?.tokens || 0,
        used,
        balance,
        purchaseCount: bought?.count || 0,
        spent: bought?.price || 0,
        lastAt: bought?.lastAt || '',
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.bought - a.bought || b.used - a.used);

  const thisMonthSubs = subscriptionRows.filter((row) => monthKey(row.startDate) === nowKey);
  const lastMonthSubs = subscriptionRows.filter((row) => monthKey(row.startDate) === lastKey);
  const thisMonthBuys = purchaseRows.filter((row) => monthKey(row.timeStamp) === nowKey);
  const usedThisMonth = (edits as any[]).filter((row) => monthKey(row.timeStamp) === nowKey).length * IMAGE_EDIT_TOKEN_COST;

  return ok(
    serialize({
      months,
      subscriptions: subscriptionRows,
      purchases: purchaseRows,
      people,
      stats: {
        activeSubscriptions: subscriptionRows.filter((row) => row.active).length,
        expiringSoon: subscriptionRows.filter((row) => row.active && row.remainingDays <= 14).length,
        subscriptionsThisMonth: thisMonthSubs.length,
        subscriptionRevenueThisMonth: thisMonthSubs.reduce((sum, row) => sum + row.price, 0),
        subscriptionRevenueLastMonth: lastMonthSubs.reduce((sum, row) => sum + row.price, 0),
        subscriptionRevenueTotal: subscriptionRows.reduce((sum, row) => sum + row.price, 0),
        tokensBought: purchaseRows.reduce((sum, row) => sum + row.tokens, 0),
        tokensUsed: (edits as any[]).length * IMAGE_EDIT_TOKEN_COST,
        tokensRemaining: (users as any[]).reduce((sum, user) => sum + Number(user.imageTokens || 0), 0),
        tokensBoughtThisMonth: thisMonthBuys.reduce((sum, row) => sum + row.tokens, 0),
        tokensUsedThisMonth: usedThisMonth,
        tokenRevenue: purchaseRows.reduce((sum, row) => sum + row.price, 0),
        tokenRevenueThisMonth: thisMonthBuys.reduce((sum, row) => sum + row.price, 0),
        buyers: people.filter((row: any) => row.bought > 0).length,
      },
    }),
  );
}
