import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  Calendar,
  FileText,
  Hash,
  Landmark,
  MapPin,
  Phone,
  Printer,
  ScrollText,
  Shirt,
  User,
  Wallet,
} from 'lucide-react';
import { InfoRow, SectionCard, TableOverflowText } from '@/ui';
import { AdminUserEditTrigger } from './AdminUserEditor';
import { ClothImageGallery } from './ClothImageGallery';
import { Price } from './Price';
import { PaymentRecordCard } from './PaymentRecordCard';
import { CHECK_DIRECTIONS, CHECK_STATUSES, checkSourceLabel, checkStatus } from '@/lib/checks';
import { personRoleLabel, personRolesLabel } from '@/lib/constants';
import { cycleLabel } from '@/lib/plans';
import { clothUnitPrice, fabricLotTotal } from '@/lib/cloth-price';
import { clothExtraKindLabel, parseClothExtras } from '@/lib/cloth-extras';
import { fabricExtraKindLabel, parseFabricExtras } from '@/lib/fabric-extras';
import { displayName, faDate, faNumber, toman } from '@/lib/format';
import { formatPacksFa, openingFromCloth, packsFromCloth, totalItems } from '@/lib/packs';
import { parseImageList } from '@/lib/shop-cart';
import type { AccountPayment } from '@/lib/payment-display';
import {
  RECORD_LIST_HREF,
  RECORD_LIST_TITLE,
  RECORD_SECTIONS,
  RECORD_TYPE_LABEL,
  recordViewPath,
  relationId,
  type DetailField,
} from '@/lib/record-view';

function emptyValue(value: unknown) {
  return (
    value == null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'number' && Number.isNaN(value))
  );
}

function boolLabel(value: unknown) {
  return value ? 'بله' : 'خیر';
}

function formatField(row: Record<string, any>, field: DetailField) {
  const value = row[field.key];
  if (field.kind === 'bool') return boolLabel(value);
  if (emptyValue(value) && field.kind !== 'bool') return '';
  if (field.kind === 'toman') return toman(value);
  if (field.kind === 'date') return faDate(value);
  if (field.kind === 'role') return personRolesLabel(value) || String(value);
  if (field.key === 'percent' || field.key === 'discountPercent') return `${faNumber(value)}٪`;
  if (field.key === 'remainingDays') return `${faNumber(value)} روز`;
  if (field.key === 'maxUses') return Number(value) > 0 ? faNumber(value) : 'نامحدود';
  if (field.key === 'usedCount' && row.maxUses != null) {
    return Number(row.maxUses) > 0 ? `${faNumber(value)} / ${faNumber(row.maxUses)}` : `${faNumber(value)} / نامحدود`;
  }
  if (field.kind === 'phone') return String(value);
  if (field.kind === 'name') return displayName(value);
  if (field.kind === 'packs') return formatPacksFa(packsFromCloth(row).packs);
  if (field.key === 'direction') return CHECK_DIRECTIONS[value === 'out' ? 'out' : 'in'];
  return String(value);
}

function fieldIcon(field: DetailField) {
  if (field.kind === 'toman' || field.key.includes('Fee') || field.key.includes('Price') || field.key === 'amount') {
    return <Banknote className="size-3.5" />;
  }
  if (field.kind === 'date' || field.key === 'dueDate') return <Calendar className="size-3.5" />;
  if (field.kind === 'phone' || field.key === 'phoneNumber' || field.key === 'phonenumber') {
    return <Phone className="size-3.5" />;
  }
  if (field.key === 'city' || field.key === 'address' || field.key === 'receiverAddress') {
    return <MapPin className="size-3.5" />;
  }
  if (field.key === 'code' || field.key === 'invoiceNumber' || field.key === 'serialNumber' || field.key === 'series') {
    return <Hash className="size-3.5" />;
  }
  if (field.linkResource === 'person' || field.key === 'fullName') return <User className="size-3.5" />;
  return <FileText className="size-3.5" />;
}

function Chip({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: 'ok' | 'warn' | 'bad' | 'muted' | 'info';
}) {
  const tones = {
    ok: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    warn: 'bg-amber-50 text-amber-800 ring-amber-100',
    bad: 'bg-rose-50 text-rose-700 ring-rose-100',
    info: 'bg-sky-50 text-sky-800 ring-sky-100',
    muted: 'bg-gray-100 text-gray-600 ring-gray-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

function decorateRow(resource: string, row: Record<string, any>) {
  if (resource === 'cloth') {
    const stock = packsFromCloth(row);
    const opening = openingFromCloth(row);
    const extras = parseClothExtras(row.extras);
    return {
      ...row,
      unitPrice: row.unitPrice ?? clothUnitPrice(row),
      count: totalItems(stock.packs) || Number(row.count || 0),
      openingCount: totalItems(opening.packs) || Number(row.openingCount || 0),
      packSummary: row.packSummary || formatPacksFa(stock.packs),
      openingSummary: row.openingSummary || formatPacksFa(opening.packs),
      extrasSummary: extras.length
        ? extras
            .map((item) => `${clothExtraKindLabel(item.kind)} ${toman(item.price)}`)
            .join(' · ')
        : '—',
    };
  }
  if (resource === 'fabric') {
    const extras = parseFabricExtras(row.extras);
    return {
      ...row,
      totalPrice: row.totalPrice ?? fabricLotTotal(row),
      extrasSummary: extras.length
        ? extras
            .map((item) => `${fabricExtraKindLabel(item.kind)} ${toman(item.price)}`)
            .join(' · ')
        : '—',
    };
  }
  if (resource === 'check') {
    const status = checkStatus(row);
    return {
      ...row,
      sourceLabel: row.direction === 'out' ? checkSourceLabel(row) : '—',
      statusLabel: CHECK_STATUSES[status],
      statusKey: status,
    };
  }
  if (resource === 'invoice') {
    const store = row._storeId;
    return {
      ...row,
      storeName:
        row.storeName || (store && typeof store === 'object' ? String(store.name || '') : row.storeName),
      brandName:
        row.brandName ||
        (store && typeof store === 'object' && store._brandId && typeof store._brandId === 'object'
          ? String(store._brandId.name || '')
          : row.brandName),
    };
  }
  if (resource === 'admin-purchase' || resource === 'admin-user') {
    return { ...row, billingCycle: cycleLabel(row.billingCycle) || row.billingCycle };
  }
  return row;
}

function recordTitle(resource: string, row: Record<string, any>) {
  if (resource === 'person') return row.fullName || 'شخص';
  if (resource === 'cloth') return row.code ? `کد ${row.code}` : 'لباس';
  if (resource === 'invoice') return row.invoiceNumber != null ? `فاکتور ${row.invoiceNumber}` : 'فاکتور';
  if (resource === 'check') return row.amount != null ? toman(row.amount) : 'چک';
  if (resource === 'fabric') return displayName(row._mercer) !== '—' ? `پارچه ${displayName(row._mercer)}` : 'پارچه';
  if (resource === 'admin-code') return row.code || 'کد تخفیف';
  if (resource === 'admin-user') return row.fullName || row.phonenumber || 'کاربر';
  if (resource === 'admin-purchase') return row.planName || 'خرید اشتراک';
  return row.name || RECORD_TYPE_LABEL[resource] || 'جزئیات';
}

function recordSubtitle(resource: string, row: Record<string, any>) {
  if (resource === 'person') {
    return [personRoleLabel(row.role), row.city].filter(Boolean).join(' · ');
  }
  if (resource === 'cloth') {
    return [displayName(row._type), displayName(row._style), displayName(row._size)]
      .filter((part) => part && part !== '—')
      .join(' · ');
  }
  if (resource === 'invoice') return displayName(row._client);
  if (resource === 'check') return [displayName(row._owner), row.dueDate].filter(Boolean).join(' · ');
  if (resource === 'fabric') return [displayName(row._tailor), row.amount ? `${faNumber(row.amount)} متر` : '']
    .filter(Boolean)
    .join(' · ');
  return '';
}

function recordChips(resource: string, row: Record<string, any>) {
  const chips: ReactNode[] = [];
  chips.push(<Chip key="type" tone="info">{RECORD_TYPE_LABEL[resource] || resource}</Chip>);
  if (resource === 'invoice') {
    chips.push(
      <Chip key="sent" tone={row.isSent ? 'ok' : 'warn'}>
        {row.isSent ? 'ارسال شده' : 'پیش‌نویس'}
      </Chip>,
    );
  }
  if (resource === 'check') {
    const status = row.statusKey || checkStatus(row);
    chips.push(
      <Chip key="status" tone={status === 'passed' ? 'ok' : status === 'failed' ? 'bad' : 'warn'}>
        {CHECK_STATUSES[status as keyof typeof CHECK_STATUSES] || status}
      </Chip>,
    );
    chips.push(
      <Chip key="dir" tone="muted">
        {CHECK_DIRECTIONS[row.direction === 'out' ? 'out' : 'in']}
      </Chip>,
    );
  }
  if (resource === 'cloth' && row.published) chips.push(<Chip key="pub" tone="ok">فروشگاه</Chip>);
  if (resource === 'person' && row.role) {
    const labels = personRolesLabel(row.role);
    if (labels) chips.push(<Chip key="role" tone="muted">{labels}</Chip>);
  }
  if ((resource === 'admin-user' || resource === 'admin-purchase' || resource === 'admin-code') && 'active' in row) {
    chips.push(<Chip key="active" tone={row.active ? 'ok' : 'muted'}>{row.active ? 'فعال' : 'غیرفعال'}</Chip>);
  }
  return chips;
}

function FieldValue({ row, field }: { row: Record<string, any>; field: DetailField }) {
  if (field.kind === 'toman') {
    const value = row[field.key];
    if (emptyValue(value)) return <span className="text-gray-400">—</span>;
    return <Price value={value} className="font-medium" />;
  }
  const text = formatField(row, field);
  if (!text) return <span className="text-gray-400">—</span>;
  if (field.kind === 'phone') {
    return (
      <span dir="ltr" className="font-medium tracking-wide">
        {text}
      </span>
    );
  }
  if (field.linkResource) {
    const id = relationId(row[field.key]);
    const href = id ? recordViewPath(field.linkResource, id) : '';
    if (href && href !== '#') {
      return (
        <Link href={href} className="text-primary hover:underline">
          {text}
        </Link>
      );
    }
  }
  return <>{text}</>;
}

export type RecordDetailExtras = {
  lines?: Array<{
    _id?: string;
    _cloth?: unknown;
    count?: number;
    price?: number;
    packs?: unknown;
    label?: string;
  }>;
  balance?: { total?: number; paid?: number; returnTotal?: number; remaining?: number };
  payments?: AccountPayment[];
  account?: {
    kind?: string;
    remaining?: number;
    paidTotal?: number;
    purchaseTotal?: number;
    creditToCustomer?: number;
    returnTotal?: number;
  };
  profit?: {
    finishedUnit?: number;
    avgSell?: number;
    netQty?: number;
    soldQty?: number;
    returnedQty?: number;
    revenue?: number;
    cogs?: number;
    totalProfit?: number;
    cashShare?: number;
    checkShare?: number;
    profitCash?: number;
    profitCheck?: number;
    sellPrices?: Array<{ price: number; count: number }>;
    sales?: Array<{
      _id: string;
      invoiceId?: string;
      invoiceNumber?: string | number;
      timeStamp?: string;
      clientId?: string;
      clientName?: string;
      count: number;
      price: number;
      amount: number;
      packs?: unknown;
    }>;
  };
};

export function RecordDetail({
  resource,
  row: raw,
  extras,
}: {
  resource: string;
  row: Record<string, any>;
  extras?: RecordDetailExtras;
}) {
  const row = decorateRow(resource, raw);
  const listHref = RECORD_LIST_HREF[resource] || '/counting/dashboard';
  const listTitle = RECORD_LIST_TITLE[resource] || 'بازگشت';
  const title = recordTitle(resource, row);
  const subtitle = recordSubtitle(resource, row);
  const sections = RECORD_SECTIONS[resource] || [
    {
      title: 'مشخصات',
      fields: Object.keys(row)
        .filter((key) => !['_id', '__v', 'isDeleted', 'password', 'refreshToken'].includes(key) && !key.startsWith('__'))
        .slice(0, 16)
        .map((key) => ({ key, label: key })),
    },
  ];
  const images = resource === 'cloth' ? parseImageList(row.images) : [];
  const description = resource === 'cloth' || resource === 'returned' ? String(row.description || '').trim() : '';

  return (
    <div className="space-y-5" dir="rtl">
      <Link
        href={listHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-800"
      >
        <ArrowRight className="size-4" />
        بازگشت به {listTitle}
      </Link>

      <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm">
        <div className="bg-gradient-to-l from-primary/10 via-white to-white px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">{recordChips(resource, row)}</div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]">{title}</h1>
              {subtitle ? <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {resource === 'invoice' ? (
                <>
                  <Link
                    href={`/counting/invoices/${row._id}/print`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:border-gray-300"
                  >
                    <Printer className="size-4" />
                    چاپ فاکتور
                  </Link>
                  <Link
                    href={`/counting/invoices/${row._id}/bijak`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:border-gray-300"
                  >
                    <ScrollText className="size-4" />
                    چاپ بیجک
                  </Link>
                </>
              ) : null}
              {resource === 'person' ? (
                <Link
                  href={`/counting/account/${row._id}/payments`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:border-gray-300"
                >
                  <Wallet className="size-4" />
                  گردش پرداخت
                </Link>
              ) : null}
              {resource === 'admin-user' ? <AdminUserEditTrigger user={raw} /> : null}
            </div>
          </div>
        </div>
      </section>

      {resource === 'cloth' ? (
        <ClothImageGallery clothId={String(row._id)} images={images} name={title} />
      ) : null}

      {extras?.profit ? (
        <SectionCard title="سود این لباس" flush={false}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="قیمت تمام‌شده (هر عدد)" value={<Price value={extras.profit.finishedUnit} />} />
            <StatCard label="میانگین فروش" value={<Price value={extras.profit.avgSell} />} />
            <StatCard
              label="فروش خالص"
              value={`${faNumber(extras.profit.netQty || 0)} عدد${
                Number(extras.profit.returnedQty || 0) > 0
                  ? ` (برگشتی ${faNumber(extras.profit.returnedQty)})`
                  : ''
              }`}
            />
            <StatCard
              label="سود کل"
              value={<Price value={extras.profit.totalProfit} />}
              emphasis
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="درآمد فروش" value={<Price value={extras.profit.revenue} />} />
            <StatCard label="هزینه تمام‌شده فروش" value={<Price value={extras.profit.cogs} />} />
            <StatCard
              icon={<Banknote className="size-4" />}
              label="سود از نقد"
              value={<Price value={extras.profit.profitCash} />}
            />
            <StatCard
              icon={<Landmark className="size-4" />}
              label="سود از چک"
              value={<Price value={extras.profit.profitCheck} />}
            />
          </div>
          {extras.profit.sellPrices?.length ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-gray-500">قیمت‌های فروش ثبت‌شده</p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {extras.profit.sellPrices.map((item) => (
                  <li
                    key={`${item.price}-${item.count}`}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <span>
                      <Price value={item.price} />
                      <span className="mr-2 text-xs text-gray-500">هر عدد</span>
                    </span>
                    <span className="text-xs text-gray-500">{faNumber(item.count)} عدد</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">هنوز فروشی برای این لباس ثبت نشده است.</p>
          )}

          {extras.profit.sales?.length ? (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-gray-800">فاکتورهای فروش این لباس</p>
              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <table className="w-full table-fixed divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5 text-right font-medium">فاکتور</th>
                      <th className="px-3 py-2.5 text-right font-medium">خریدار</th>
                      <th className="px-3 py-2.5 text-right font-medium">تاریخ</th>
                      <th className="px-3 py-2.5 text-right font-medium">تعداد</th>
                      <th className="px-3 py-2.5 text-right font-medium">فی</th>
                      <th className="px-3 py-2.5 text-right font-medium">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {extras.profit.sales.map((sale) => (
                      <tr key={sale._id}>
                        <td className="px-3 py-3">
                          {sale.invoiceId ? (
                            <Link
                              href={recordViewPath('invoice', sale.invoiceId)}
                              className="text-primary hover:underline"
                            >
                              {sale.invoiceNumber || sale.invoiceId}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="max-w-0 overflow-hidden px-3 py-3">
                          <TableOverflowText>
                            {sale.clientId ? (
                              <Link
                                href={recordViewPath('person', sale.clientId)}
                                className="text-primary hover:underline"
                              >
                                {sale.clientName || '—'}
                              </Link>
                            ) : (
                              sale.clientName || '—'
                            )}
                          </TableOverflowText>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                          {faDate(sale.timeStamp)}
                        </td>
                        <td className="px-3 py-3">
                          {faNumber(sale.count)}
                          {Array.isArray(sale.packs) && sale.packs.length ? (
                            <span className="mt-0.5 block text-[11px] text-gray-400">
                              {formatPacksFa(sale.packs as any)}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <Price value={sale.price} />
                        </td>
                        <td className="px-3 py-3 font-medium">
                          <Price value={sale.amount} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <p className="mt-3 text-[11px] text-gray-400">
            سود نقد و چک بر اساس سهم این لباس از پرداخت‌های فاکتورهای مربوطه برآورد می‌شود.
          </p>
        </SectionCard>
      ) : null}

      {extras?.balance ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<Shirt className="size-4" />} label="جمع فاکتور" value={<Price value={extras.balance.total} />} />
          <StatCard icon={<Banknote className="size-4" />} label="پرداخت‌شده" value={<Price value={extras.balance.paid} />} />
          <StatCard icon={<Landmark className="size-4" />} label="برگشتی" value={<Price value={extras.balance.returnTotal} />} />
          <StatCard
            icon={<Wallet className="size-4" />}
            label="مانده"
            value={<Price value={extras.balance.remaining} />}
            emphasis
          />
        </div>
      ) : null}

      {extras?.account ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="خرید / بدهی" value={<Price value={extras.account.purchaseTotal} />} />
          <StatCard label="پرداخت‌شده" value={<Price value={extras.account.paidTotal} />} />
          {extras.account.kind === 'receivable' ? (
            <StatCard label="برگشتی" value={<Price value={extras.account.returnTotal} />} />
          ) : null}
          <StatCard
            label={Number(extras.account.creditToCustomer || 0) > 0 ? 'بستانکار مشتری' : 'مانده'}
            value={
              <Price
                value={
                  Number(extras.account.creditToCustomer || 0) > 0
                    ? extras.account.creditToCustomer
                    : extras.account.remaining
                }
              />
            }
            emphasis
          />
        </div>
      ) : null}

      {sections.map((section) => {
        const visible = section.fields.filter((field) => {
          if (resource === 'cloth') {
            const produced =
              row.isProduced === true ||
              row.isProduced === 'true' ||
              (row.isProduced == null && Boolean(row._producedFrom || row._tailor));
            if (['_producedFrom', 'amountUsed', '_tailor', 'tailorFee', '_wash', 'washFee', '_trim', 'trimFee', '_print', 'printFee'].includes(field.key)) {
              if (!produced) return false;
            }
            if (field.key === '_boughtFrom') {
              if (produced || row.fromPastStock === true || row.fromPastStock === 'true') return false;
            }
            if (field.key === 'fromPastStock') {
              if (produced) return false;
            }
          }
          if (field.kind === 'bool') return true;
          const value = row[field.key];
          return !emptyValue(value);
        });
        if (!visible.length) return null;
        return (
          <SectionCard key={section.title} title={section.title} flush={false}>
            <div className="grid gap-3 sm:grid-cols-2">
              {visible.map((field) => (
                <InfoRow
                  key={field.key}
                  label={field.label}
                  icon={fieldIcon(field)}
                  value={<FieldValue row={row} field={field} />}
                />
              ))}
            </div>
          </SectionCard>
        );
      })}

      {description ? (
        <SectionCard title="توضیح" flush={false}>
          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{description}</p>
        </SectionCard>
      ) : null}

      {Array.isArray(extras?.lines) && extras.lines.length ? (
        <SectionCard title="اقلام فاکتور" flush={false}>
          <div className="overflow-hidden rounded-2xl border border-gray-100">
            <table className="w-full table-fixed divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-right font-medium">لباس</th>
                  <th className="px-4 py-2.5 text-right font-medium">تعداد</th>
                  <th className="px-4 py-2.5 text-right font-medium">فی</th>
                  <th className="px-4 py-2.5 text-right font-medium">مبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {extras.lines.map((line, index) => {
                  const count = Number(line.count || 0);
                  const price = Number(line.price || 0);
                  const cloth = line._cloth;
                  const clothId = relationId(cloth);
                  const label =
                    line.label ||
                    (typeof cloth === 'object' && cloth
                      ? [displayName(cloth), (cloth as { code?: string }).code].filter(Boolean).join(' — ')
                      : 'لباس');
                  return (
                    <tr key={String(line._id || index)}>
                      <td className="max-w-0 overflow-hidden px-4 py-3">
                        <TableOverflowText>
                          {clothId ? (
                            <Link href={recordViewPath('cloth', clothId)} className="text-primary hover:underline">
                              {label}
                            </Link>
                          ) : (
                            label
                          )}
                        </TableOverflowText>
                        {Array.isArray(line.packs) && line.packs.length ? (
                          <TableOverflowText className="mt-0.5 text-xs text-gray-400">
                            {formatPacksFa(line.packs as any)}
                          </TableOverflowText>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{faNumber(count)}</td>
                      <td className="px-4 py-3">
                        <Price value={price} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Price value={count * price} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {resource === 'invoice' ? (
        <SectionCard title="پرداخت‌های این فاکتور" flush={false}>
          {Array.isArray(extras?.payments) && extras.payments.length ? (
            <div className="space-y-3">
              {[...extras.payments]
                .sort((a, b) => String(b.timeStamp || '').localeCompare(String(a.timeStamp || '')))
                .map((payment) => (
                  <PaymentRecordCard
                    key={String(payment._id)}
                    row={payment}
                    payable={false}
                    showTarget={false}
                  />
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">هنوز پرداختی برای این فاکتور ثبت نشده است.</p>
          )}
        </SectionCard>
      ) : null}

      {resource === 'admin-code' && Array.isArray(row.users) && row.users.length ? (
        <SectionCard title="کاربران این کد" flush={false}>
          <div className="flex flex-wrap gap-2">
            {row.users.map((user: { _id: string; fullName?: string; phonenumber?: string }) => (
              <Chip key={user._id} tone="muted">
                {[user.fullName, user.phonenumber].filter(Boolean).join(' — ') || user._id}
              </Chip>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 shadow-sm ${
        emphasis ? 'border-primary/20 bg-primary/5' : 'border-gray-200/80 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function RecordMissing({ resource, message }: { resource: string; message?: string }) {
  const listHref = RECORD_LIST_HREF[resource] || '/counting/dashboard';
  const listTitle = RECORD_LIST_TITLE[resource] || 'بازگشت';
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm" dir="rtl">
      <p className="text-gray-700">{message || 'این مورد پیدا نشد.'}</p>
      <Link href={listHref} className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
        <ArrowRight className="size-4" />
        بازگشت به {listTitle}
      </Link>
    </div>
  );
}
