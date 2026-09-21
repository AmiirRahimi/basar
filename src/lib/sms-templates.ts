import { BRAND } from './brand';
import { faNumber } from './format';

export type SmsTemplateId =
  | 'discount'
  | 'new-products'
  | 'sale'
  | 'catalog'
  | 'payment'
  | 'welcome'
  | 'restock'
  | 'custom';

export type SmsTemplateVars = {
  name?: string;
  amount?: string;
  discount?: string;
  payNow?: string;
  link?: string;
  brand?: string;
};

export type SmsTemplate = {
  id: SmsTemplateId;
  title: string;
  hint: string;
  body: string;
  needsLink?: boolean;
  needsDiscount?: boolean;
  personalized?: boolean;
};

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'discount',
    title: 'تخفیف ویژه',
    hint: 'اعلام تخفیف عمده به مشتریان',
    body: '{name} عزیز، تخفیف ویژه عمده‌فروشی {brand} آمده است. همین حالا ببینید:\n{link}',
    needsLink: true,
    personalized: true,
  },
  {
    id: 'new-products',
    title: 'محصولات جدید',
    hint: 'اطلاع کالکشن یا مدل تازه',
    body: 'محصولات جدید {brand} رسید. برای دیدن و سفارش عمده به این لینک سر بزنید:\n{link}',
    needsLink: true,
  },
  {
    id: 'sale',
    title: 'حراج عمده',
    hint: 'شروع حراج یا فروش ویژه',
    body: 'حراج ویژه عمده {brand} شروع شد. تا موجود است ببینید:\n{link}',
    needsLink: true,
  },
  {
    id: 'catalog',
    title: 'لینک کاتالوگ',
    hint: 'ارسال صفحه محصولات',
    body: 'کاتالوگ عمده‌فروشی {brand} آماده است. مشاهده و سفارش:\n{link}',
    needsLink: true,
  },
  {
    id: 'payment',
    title: 'مانده حساب',
    hint: 'یادآوری بدهی با تخفیف پرداخت فوری',
    body: '{name} عزیز، مانده حساب شما {amount} است. اگر همین حالا بپردازید {discount} تخفیف می‌گیرید و مبلغ پرداخت {payNow} می‌شود.',
    needsDiscount: true,
    personalized: true,
  },
  {
    id: 'welcome',
    title: 'خوش‌آمد',
    hint: 'پیام خوش‌آمد به مشتری جدید',
    body: '{name} عزیز، به {brand} خوش آمدید. محصولات عمده را از این لینک ببینید:\n{link}',
    needsLink: true,
    personalized: true,
  },
  {
    id: 'restock',
    title: 'شارژ موجودی',
    hint: 'اطلاع رسیدن مجدد جنس',
    body: 'موجودی تازه {brand} شارژ شد. برای سفارش عمده سری بزنید:\n{link}',
    needsLink: true,
  },
  {
    id: 'custom',
    title: 'متن آزاد',
    hint: 'متن دلخواه؛ می‌توانید از {name} و {link} استفاده کنید',
    body: '',
    needsLink: true,
    personalized: true,
  },
];

export function smsTemplateById(id: string) {
  return SMS_TEMPLATES.find((row) => row.id === id) || SMS_TEMPLATES[SMS_TEMPLATES.length - 1];
}

export function fillSmsTemplate(body: string, vars: SmsTemplateVars) {
  const values: Required<SmsTemplateVars> = {
    name: vars.name?.trim() || 'مشتری',
    amount: vars.amount || '',
    discount: vars.discount || '',
    payNow: vars.payNow || '',
    link: vars.link || '',
    brand: vars.brand || BRAND.name,
  };
  return body
    .replace(/\{name\}/g, values.name)
    .replace(/\{amount\}/g, values.amount)
    .replace(/\{discount\}/g, values.discount)
    .replace(/\{payNow\}/g, values.payNow)
    .replace(/\{link\}/g, values.link)
    .replace(/\{brand\}/g, values.brand)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatSmsAmount(value: number) {
  return `${faNumber(Math.max(0, Math.round(value)))} تومان`;
}

export function formatSmsDiscount(percent: number) {
  const n = Math.max(0, Math.min(100, Number(percent) || 0));
  return `${faNumber(n)}٪`;
}

export function payNowAmount(remaining: number, percent: number) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  return Math.max(0, Math.round(remaining * (1 - p / 100)));
}
