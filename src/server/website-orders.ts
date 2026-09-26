import mongoose from 'mongoose';
import { persianYearMonth } from '@/lib/checks';
import { mergePacks, parsePacks } from '@/lib/packs';
import {
  normalizeWebsiteOrderStatus,
  websiteOrderStatusLabel,
  WEBSITE_ORDER_STATUSES,
  type WebsiteOrderBoard,
  type WebsiteOrderStatus,
} from '@/lib/website-orders';
import { STOREFRONT_CHANNEL } from '@/lib/storefront';
import { db, dbEngine, serialize } from './db';
import { fileModels } from './file-db';
import * as mongo from './models';
import { fail, ok, type ActionResult } from './result';
import { requirePlatformAdmin } from './admin';

function M() {
  return dbEngine() === 'file' ? fileModels : mongo;
}

function oid(value: unknown) {
  if (value == null || value === '') return undefined;
  const textValue = String(value);
  return mongoose.Types.ObjectId.isValid(textValue) ? new mongoose.Types.ObjectId(textValue) : value;
}

function idOf(value: unknown) {
  if (!value) return '';
  if (typeof value === 'object' && value && '_id' in value) return String((value as { _id?: unknown })._id || '');
  return String(value);
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function nameOf(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  return text((value as { name?: unknown; fullName?: unknown }).name || (value as { fullName?: unknown }).fullName);
}

function packsLabel(packs: unknown) {
  return mergePacks(parsePacks(packs))
    .map((pack) => `${pack.count} بسته ${pack.items} تایی`)
    .join('، ');
}

function clothName(cloth: unknown) {
  if (!cloth || typeof cloth !== 'object') return 'لباس';
  const row = cloth as { code?: unknown; _type?: unknown; _style?: unknown };
  const label = [nameOf(row._type), nameOf(row._style)].filter(Boolean).join(' ');
  return label || (row.code ? `لباس ${row.code}` : 'لباس');
}

function paymentAmount(row: Record<string, unknown>) {
  const cash = Number(row.cashAmount || row.cash || 0);
  const check = Number(row.checkAmount || 0);
  return cash + check;
}

async function loadWebsiteOrders() {
  const invoices = await M()
    .Invoice.find({ isDeleted: false, publicToken: { $exists: true } })
    .populate('_client', 'fullName phoneNumber')
    .populate('_storeId', 'name')
    .populate('_brandId', 'name')
    .sort('-timeStamp')
    .lean();
  const website = (invoices as Record<string, unknown>[]).filter((invoice) => text(invoice.publicToken));
  const invoiceIds = website.map((invoice) => idOf(invoice._id)).filter(Boolean);
  const [lines, payments] = await Promise.all([
    invoiceIds.length
      ? M()
          .CustomerCart.find({ isDeleted: false, _invoice: { $in: invoiceIds.map((id) => oid(id)) } })
          .populate({ path: '_cloth', populate: [{ path: '_type' }, { path: '_style' }] })
          .lean()
      : [],
    invoiceIds.length
      ? M()
          .Payment.find({ isDeleted: false, _invoice: { $in: invoiceIds.map((id) => oid(id)) } })
          .sort('-timeStamp')
          .lean()
      : [],
  ]);
  const linesByInvoice = new Map<string, Record<string, unknown>[]>();
  for (const line of lines as Record<string, unknown>[]) {
    const invoiceId = idOf(line._invoice);
    const bucket = linesByInvoice.get(invoiceId) || [];
    bucket.push(line);
    linesByInvoice.set(invoiceId, bucket);
  }
  const paidByInvoice = new Map<string, number>();
  for (const payment of payments as Record<string, unknown>[]) {
    const invoiceId = idOf(payment._invoice);
    paidByInvoice.set(invoiceId, (paidByInvoice.get(invoiceId) || 0) + paymentAmount(payment));
  }
  return { website, linesByInvoice, payments: payments as Record<string, unknown>[], paidByInvoice };
}

function orderTotal(lines: Record<string, unknown>[]) {
  return lines.reduce((sum, line) => sum + Number(line.count || 0) * Number(line.price || 0), 0);
}

export async function getWebsiteOrderBoard(): Promise<ActionResult> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;
  await db();
  const loaded = await loadWebsiteOrders();
  const monthKey = persianYearMonth(new Date());
  const orders = loaded.website.map((invoice) => {
    const cart = loaded.linesByInvoice.get(idOf(invoice._id)) || [];
    const client = invoice._client as { fullName?: string; phoneNumber?: unknown } | string;
    const status = normalizeWebsiteOrderStatus(invoice.orderStatus, Boolean(invoice.isSent));
    const total = orderTotal(cart);
    const paidAmount =
      loaded.paidByInvoice.get(idOf(invoice._id)) ||
      (text(invoice.channel) === STOREFRONT_CHANNEL ? total : 0);
    return {
      id: idOf(invoice._id),
      invoiceNumber: Number(invoice.invoiceNumber || 0),
      date: invoice.timeStamp ? new Date(String(invoice.timeStamp)).toISOString() : '',
      status,
      statusLabel: websiteOrderStatusLabel(status),
      total,
      paidAmount,
      customerName: client && typeof client === 'object' ? text(client.fullName) : '',
      customerPhone: client && typeof client === 'object' ? text(client.phoneNumber) : '',
      address: text(invoice.receiverAddress),
      storeName: nameOf(invoice._storeId) || 'فروشگاه',
      brandName: nameOf(invoice._brandId),
      channel: text(invoice.channel),
      lines: cart.map((line) => ({
        name: clothName(line._cloth),
        packsLabel: packsLabel(line.packs),
        count: Number(line.count || 0),
        total: Number(line.count || 0) * Number(line.price || 0),
      })),
    };
  });

  const active = orders.filter((order) => order.status !== 'cancelled');
  const buyers = new Map<string, { phone: string; name: string; orders: number; total: number; lastOrder: string }>();
  for (const order of active) {
    const key = order.customerPhone || order.customerName || order.id;
    const current = buyers.get(key) || {
      phone: order.customerPhone,
      name: order.customerName || 'خریدار',
      orders: 0,
      total: 0,
      lastOrder: '',
    };
    current.orders += 1;
    current.total += order.total;
    if (!current.name && order.customerName) current.name = order.customerName;
    if (!current.lastOrder || order.date > current.lastOrder) current.lastOrder = order.date;
    buyers.set(key, current);
  }

  const board: WebsiteOrderBoard = {
    stats: {
      total: active.reduce((sum, order) => sum + order.total, 0),
      orders: active.length,
      thisMonth: active
        .filter((order) => order.date && persianYearMonth(order.date) === monthKey)
        .reduce((sum, order) => sum + order.total, 0),
      unpaid: active.reduce((sum, order) => sum + Math.max(0, order.total - order.paidAmount), 0),
      buyers: buyers.size,
      cancelled: orders.length - active.length,
    },
    statusCounts: WEBSITE_ORDER_STATUSES.map((item) => ({
      id: item.id,
      label: item.label,
      count: orders.filter((order) => order.status === item.id).length,
    })),
    buyers: [...buyers.values()].sort((a, b) => b.total - a.total),
    orders,
    payments: loaded.payments.map((payment) => {
      const order = orders.find((item) => item.id === idOf(payment._invoice));
      const amount = paymentAmount(payment);
      const kind = Number(payment.checkAmount || 0) > 0 && amount > Number(payment.checkAmount || 0)
        ? 'نقد و چک'
        : Number(payment.checkAmount || 0) > 0
          ? 'چک'
          : text(payment.description).includes('درگاه')
            ? 'درگاه'
            : 'نقد';
      return {
        id: idOf(payment._id),
        date: payment.timeStamp ? new Date(String(payment.timeStamp)).toISOString() : '',
        invoiceNumber: order?.invoiceNumber || 0,
        customerName: order?.customerName || '',
        customerPhone: order?.customerPhone || '',
        amount,
        kind,
        description: text(payment.description),
      };
    }),
  };
  return ok(serialize(board));
}

export async function setWebsiteOrderStatus(id: string, status: string): Promise<ActionResult> {
  const access = await requirePlatformAdmin();
  if ('error' in access) return access.error;
  await db();
  const next = WEBSITE_ORDER_STATUSES.find((item) => item.id === status)?.id as WebsiteOrderStatus | undefined;
  if (!next) return fail('وضعیت سفارش معتبر نیست');
  const invoice = await M().Invoice.findOne({ _id: oid(id), isDeleted: false }).select('_id publicToken').lean();
  if (!invoice || !text((invoice as { publicToken?: unknown }).publicToken)) return fail('سفارش وب‌سایت پیدا نشد', 404);
  await M().Invoice.findByIdAndUpdate(id, {
    orderStatus: next,
    isSent: next === 'shipped' || next === 'delivered',
  });
  return ok({ id, status: next }, 'وضعیت سفارش عوض شد');
}
