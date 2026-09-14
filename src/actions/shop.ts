'use server';

import { clothToProduct, sampleCatalog } from '@/lib/catalog';
import { nestFetch } from '@/lib/nest';
import type { CatalogProduct, Cloth } from '@/lib/types';
import { cookies } from 'next/headers';
import { CART_COOKIE } from '@/lib/constants';
import type { WholesaleCartItem } from '@/lib/types';
import { addInvoiceLine, createResource } from './crud';

export async function getCatalog(): Promise<CatalogProduct[]> {
  const res = await nestFetch<Cloth[]>('/cloth/public', { auth: false });
  if (res.ok && Array.isArray(res.data) && res.data.length) {
    return res.data.map(clothToProduct);
  }
  const staff = await nestFetch<Cloth[]>('/cloth?page=1&skip=40');
  if (staff.ok && Array.isArray(staff.data) && staff.data.length) {
    return staff.data.map(clothToProduct);
  }
  return sampleCatalog();
}

export async function getCatalogProduct(id: string): Promise<CatalogProduct | null> {
  const all = await getCatalog();
  return all.find((p) => p.id === id) || null;
}

export async function getCartItems(): Promise<WholesaleCartItem[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WholesaleCartItem[];
  } catch {
    return [];
  }
}

export async function saveCart(items: WholesaleCartItem[]) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(items), { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 14 });
}

export async function addToCart(productId: string, qty: number, minOrderQty: number) {
  if (qty < minOrderQty) {
    return { ok: false, message: `حداقل سفارش عمده ${minOrderQty} عدد است` };
  }
  const items = await getCartItems();
  const existing = items.find((i) => i.productId === productId);
  if (existing) existing.qty += qty;
  else items.push({ productId, qty });
  await saveCart(items);
  return { ok: true, message: 'به سبد عمده اضافه شد' };
}

export async function updateCartQty(productId: string, qty: number, minOrderQty: number) {
  if (qty === 0) {
    await saveCart((await getCartItems()).filter((i) => i.productId !== productId));
    return { ok: true, message: 'حذف شد' };
  }
  if (qty < minOrderQty) {
    return { ok: false, message: `حداقل سفارش عمده ${minOrderQty} عدد است` };
  }
  const items = await getCartItems();
  const line = items.find((i) => i.productId === productId);
  if (line) line.qty = qty;
  await saveCart(items);
  return { ok: true, message: 'سبد به‌روز شد' };
}

export async function checkoutWholesale(input: {
  fullName: string;
  phone: string;
  address: string;
  customerId?: string;
}) {
  const cart = await getCartItems();
  const catalog = await getCatalog();
  if (!cart.length) return { ok: false, message: 'سبد خالی است' };

  let customerId = input.customerId;
  if (!customerId) {
    const created = await createResource('person', {
      fullName: input.fullName,
      phoneNumber: input.phone,
      address: input.address,
      city: 0,
      role: '1',
    });
    customerId = (created.data as any)?._id;
    if (!created.ok || !customerId) {
      return { ok: false, message: created.message || 'برای ثبت سفارش عمده ابتدا وارد شمارش شوید' };
    }
  }

  const invoice = await createResource('invoice', {
    _client: customerId,
    receiverAddress: input.address,
    items: [],
  });
  const invoiceId = (invoice.data as any)?._id;
  if (!invoice.ok || !invoiceId) {
    return { ok: false, message: invoice.message || 'ثبت فاکتور ناموفق بود' };
  }

  for (const line of cart) {
    const product = catalog.find((p) => p.id === line.productId);
    if (!product) continue;
    await addInvoiceLine({
      _invoice: invoiceId,
      _cloth: product.id.startsWith('sample-') ? undefined : product.id,
      count: line.qty,
      price: product.wholesalePrice,
    });
  }

  await saveCart([]);
  return { ok: true, message: 'سفارش عمده ثبت شد', invoiceId };
}
