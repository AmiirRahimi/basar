'use server';

import { clothToProduct } from '@/lib/catalog';
import { CART_COOKIE, DEFAULT_MOQ, SHARE_TOKEN_COOKIE } from '@/lib/constants';
import { normalizeCartItem } from '@/lib/shop-cart';
import { meetsWholesaleMoq, mergePacks, packsToOrder, subtractPacks, totalItems, type ClothPack } from '@/lib/packs';
import type { CatalogProduct, Cloth, PublicOrderSummary, WholesaleCartItem } from '@/lib/types';
import { cookies } from 'next/headers';
import { loadSharedClothes } from './share';
import {
  getPublicCatalogProduct,
  getShopCartProduct,
  listPublicCatalog,
  loadPublicOrders,
  loadStorefrontOrders,
  placePublicWholesaleOrder,
} from './crud';

export async function getCatalog(): Promise<CatalogProduct[]> {
  const published = await listPublicCatalog();
  if (published.ok && Array.isArray(published.data) && published.data.length) {
    return published.data.map((cloth) => clothToProduct(cloth as Cloth));
  }
  return [];
}

export async function getSharedCatalog(token: string) {
  const found = await loadSharedClothes(token);
  if (!found.ok || !found.data) return { ok: false as const, title: '', products: [] as CatalogProduct[], message: found.message };
  const data = found.data as { title?: string; clothes?: Cloth[] };
  return {
    ok: true as const,
    title: String(data.title || ''),
    products: (Array.isArray(data.clothes) ? data.clothes : []).map((cloth) => clothToProduct(cloth)),
    message: '',
  };
}

export async function getCatalogProduct(id: string): Promise<CatalogProduct | null> {
  const found = await getPublicCatalogProduct(id);
  if (found.ok && found.data) return clothToProduct(found.data as Cloth);
  const all = await getCatalog();
  return all.find((product) => product.id === id) || null;
}

async function getCartProduct(id: string): Promise<CatalogProduct | null> {
  const published = await getCatalogProduct(id);
  if (published) return published;
  const found = await getShopCartProduct(id);
  if (found.ok && found.data) return clothToProduct(found.data as Cloth);
  return null;
}

async function catalogWithCartProducts(catalog: CatalogProduct[], items: Array<{ productId?: string }>) {
  const extras: CatalogProduct[] = [];
  for (const line of items) {
    const id = String(line.productId || '');
    if (!id || catalog.some((row) => row.id === id) || extras.some((row) => row.id === id)) continue;
    const product = await getCartProduct(id);
    if (product) extras.push(product);
  }
  return extras.length ? [...catalog, ...extras] : catalog;
}

function parseCookieRows(raw: string | undefined): WholesaleCartItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as WholesaleCartItem[]) : [];
  } catch {
    return [];
  }
}

function parseCookieCart(raw: string | undefined, catalog: CatalogProduct[]): WholesaleCartItem[] {
  return parseCookieRows(raw)
    .map((row) => {
      const productId = row && typeof row === 'object' ? String(row.productId || '') : '';
      const product = catalog.find((item) => item.id === productId) || null;
      return normalizeCartItem(row, product);
    })
    .filter(Boolean) as WholesaleCartItem[];
}

export async function resolveShopCatalog(catalog?: CatalogProduct[]) {
  const base = catalog ?? (await getCatalog());
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  return catalogWithCartProducts(base, parseCookieRows(raw));
}

export async function getCartItems(catalog?: CatalogProduct[]): Promise<WholesaleCartItem[]> {
  const products = await resolveShopCatalog(catalog);
  return parseCookieCart((await cookies()).get(CART_COOKIE)?.value, products);
}

export async function saveCart(items: WholesaleCartItem[]) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(items.slice(0, 20)), {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 14,
    secure: process.env.NODE_ENV === 'production',
  });
}

async function persistCart(items: WholesaleCartItem[]) {
  const next = items.filter((item) => totalItems(item.packs) > 0);
  await saveCart(next);
  return next;
}

export async function setCartPacks(productId: string, packs: ClothPack[], takenOrder: number[] = []) {
  const product = await getCartProduct(productId);
  if (!product) return { ok: false, message: 'این مدل در کاتالوگ نیست', items: await getCartItems() };
  const merged = mergePacks(packs);
  const pieces = totalItems(merged);
  if (!pieces) {
    const items = await persistCart((await getCartItems()).filter((item) => item.productId !== productId));
    return { ok: true, message: 'از سبد حذف شد', items };
  }
  const remaining = subtractPacks(product.packs, merged);
  if (!remaining) return { ok: false, message: 'موجودی این بسته‌ها کافی نیست', items: await getCartItems() };
  if (
    !meetsWholesaleMoq(
      pieces,
      Number(product.minOrderQty || DEFAULT_MOQ),
      product.packs,
      merged,
      product.packSize,
    )
  ) {
    return { ok: false, message: `حداقل سفارش عمده ${product.minOrderQty} عدد است`, items: await getCartItems() };
  }
  const items = await getCartItems();
  const line = items.find((item) => item.productId === productId);
  const nextLine: WholesaleCartItem = {
    productId,
    packs: merged,
    takenOrder: takenOrder.length ? takenOrder : packsToOrder(merged, product.packSize),
  };
  if (line) Object.assign(line, nextLine);
  else if (items.length >= 20) {
    return { ok: false, message: 'سبد پر است', items };
  } else items.push(nextLine);
  const saved = await persistCart(items);
  return { ok: true, message: 'سبد بسته‌ها به‌روز شد', items: saved };
}

export async function removeFromCart(productId: string) {
  const items = await persistCart((await getCartItems()).filter((item) => item.productId !== productId));
  return { ok: true, message: 'حذف شد', items };
}

export async function rememberShareToken(token: string) {
  const value = String(token || '').trim();
  if (!value) return { ok: false as const };
  (await cookies()).set(SHARE_TOKEN_COOKIE, value, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 14,
    secure: process.env.NODE_ENV === 'production',
  });
  return { ok: true as const };
}

export async function checkoutWholesale(input: { fullName: string; phone: string; address: string }) {
  const cart = await getCartItems();
  if (!cart.length) return { ok: false, message: 'سبد خالی است', invoices: [] as PublicOrderSummary[] };
  const items = cart
    .map((line) => ({ productId: line.productId, packs: line.packs }))
    .filter((line) => line.productId);
  const shareToken = (await cookies()).get(SHARE_TOKEN_COOKIE)?.value || '';
  const result = await placePublicWholesaleOrder({
    fullName: input.fullName,
    phone: input.phone,
    address: input.address,
    items,
    shareToken,
  });
  if (!result.ok || !result.data) {
    return { ok: false, message: result.message || 'ثبت سفارش ناموفق بود', invoices: [] as PublicOrderSummary[] };
  }
  await saveCart([]);
  (await cookies()).set(SHARE_TOKEN_COOKIE, '', { path: '/', maxAge: 0 });
  const invoices = (result.data as { invoices?: PublicOrderSummary[] }).invoices || [];
  return { ok: true, message: result.message || 'سفارش عمده ثبت شد', invoices };
}

export async function getPublicOrders(ids: string[]) {
  const result = await loadPublicOrders(ids);
  if (!result.ok || !result.data) return [];
  return result.data as PublicOrderSummary[];
}

export async function getStorefrontOrderBoard() {
  return loadStorefrontOrders();
}
