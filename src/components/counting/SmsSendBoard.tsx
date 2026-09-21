'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send } from 'lucide-react';
import { sendAdminSms } from '@/actions/sms';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import {
  SMS_TEMPLATES,
  fillSmsTemplate,
  formatSmsAmount,
  formatSmsDiscount,
  payNowAmount,
  smsTemplateById,
  type SmsTemplateId,
} from '@/lib/sms-templates';
import { Button, Input, Textarea, toast } from '@/ui';

export type SmsPerson = {
  _id: string;
  fullName?: string;
  phone?: string;
  city?: string;
  roleLabel?: string;
  customer?: boolean;
  remaining?: number;
};

export type SmsUser = {
  _id: string;
  fullName?: string;
  phone?: string;
  city?: string;
};

export type SmsCampaign = {
  _id: string;
  title?: string;
  templateId?: string;
  audience?: string;
  sentCount?: number;
  failedCount?: number;
  phones?: string[];
  timeStamp?: string;
  link?: string;
};

export type SmsBoardData = {
  configured: boolean;
  live: boolean;
  hasLine: boolean;
  credit: number | null;
  defaultLink: string;
  newProductsLink: string;
  people: SmsPerson[];
  users: SmsUser[];
  history: SmsCampaign[];
};

const AUDIENCES = [
  { id: 'customers', label: 'مشتریان عمده' },
  { id: 'debtors', label: 'مانده‌حساب' },
  { id: 'people', label: 'همه اشخاص' },
  { id: 'users', label: 'کاربران پنل' },
  { id: 'custom', label: 'انتخابی' },
] as const;

type AudienceId = (typeof AUDIENCES)[number]['id'];

export function SmsSendBoard({ data }: { data: SmsBoardData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [templateId, setTemplateId] = useState<SmsTemplateId>('discount');
  const [audience, setAudience] = useState<AudienceId>('customers');
  const [query, setQuery] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<string[]>(() =>
    data.people.filter((row) => row.customer && row.phone).map((row) => row._id),
  );
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [extraPhones, setExtraPhones] = useState('');
  const [link, setLink] = useState(data.defaultLink);
  const [discount, setDiscount] = useState('1');
  const [customBody, setCustomBody] = useState('');

  const template = smsTemplateById(templateId);
  const body = templateId === 'custom' ? customBody : customBody || template.body;
  const discountPercent = Math.max(0, Math.min(100, Number(discount || 0) || 0));

  const people = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.people.filter((row) => {
      if (!row.phone) return false;
      if (audience === 'customers' && !row.customer) return false;
      if (audience === 'debtors' && !(Number(row.remaining || 0) > 0)) return false;
      if (audience === 'users') return false;
      if (!term) return true;
      return [row.fullName, row.phone, row.city, row.roleLabel, String(row.remaining || '')]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [audience, data.people, query]);

  const users = useMemo(() => {
    if (audience !== 'users') return [];
    const term = query.trim().toLowerCase();
    return data.users.filter((row) => {
      if (!row.phone) return false;
      if (!term) return true;
      return [row.fullName, row.phone, row.city].join(' ').toLowerCase().includes(term);
    });
  }, [audience, data.users, query]);

  const selectedCount =
    (audience === 'users' ? selectedUsers.length : selectedPeople.length) +
    extraPhones.split(/[\s,;]+/).filter(Boolean).length;

  const previewTarget =
    audience === 'users'
      ? data.users.find((row) => selectedUsers.includes(row._id) && row.phone)
      : data.people.find((row) => selectedPeople.includes(row._id) && row.phone) || people[0];
  const previewRemaining = previewTarget && 'remaining' in previewTarget ? Number(previewTarget.remaining || 0) : 0;
  const previewText = fillSmsTemplate(body, {
    name: previewTarget?.fullName || 'مشتری',
    amount: formatSmsAmount(previewRemaining),
    discount: formatSmsDiscount(discountPercent),
    payNow: formatSmsAmount(payNowAmount(previewRemaining, discountPercent)),
    link: link.trim() || (templateId === 'new-products' ? data.newProductsLink : data.defaultLink),
  });

  function applyAudience(next: AudienceId) {
    setAudience(next);
    setQuery('');
    if (next === 'users') {
      setSelectedPeople([]);
      setSelectedUsers(data.users.filter((row) => row.phone).map((row) => row._id));
      return;
    }
    setSelectedUsers([]);
    if (next === 'custom') return;
    setSelectedPeople(
      data.people
        .filter((row) => {
          if (!row.phone) return false;
          if (next === 'customers') return Boolean(row.customer);
          if (next === 'debtors') return Number(row.remaining || 0) > 0;
          return true;
        })
        .map((row) => row._id),
    );
  }

  function pickTemplate(id: SmsTemplateId) {
    setTemplateId(id);
    setCustomBody(id === 'custom' ? customBody : '');
    if (id === 'new-products' && data.newProductsLink) setLink(data.newProductsLink);
    else if (id !== 'payment' && !link) setLink(data.defaultLink);
    if (id === 'payment') applyAudience('debtors');
  }

  function togglePerson(id: string) {
    setAudience('custom');
    setSelectedPeople((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleUser(id: string) {
    setSelectedUsers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function selectVisible() {
    if (audience === 'users') {
      setSelectedUsers(users.map((row) => row._id));
      return;
    }
    setAudience('custom');
    setSelectedPeople(people.map((row) => row._id));
  }

  function send() {
    if (!body.trim()) {
      toast.error('متن پیامک را بنویسید');
      return;
    }
    if (!selectedCount) {
      toast.error('حداقل یک گیرنده انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await sendAdminSms({
        templateId,
        body,
        audience,
        personIds: audience === 'users' ? [] : selectedPeople,
        userIds: audience === 'users' ? selectedUsers : [],
        extraPhones,
        link,
        discountPercent,
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'ارسال شد');
        router.refresh();
      } else {
        toast.error(res.message || 'ارسال ناموفق بود');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {data.configured ? (
          <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">SMS.ir متصل است</span>
        ) : (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">کلید API تنظیم نشده</span>
        )}
        {data.hasLine ? null : <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">شماره خط لازم است</span>}
        {!data.live ? (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">حالت آزمایشی — پیامک فقط لاگ می‌شود</span>
        ) : null}
        {data.credit != null ? (
          <span className="rounded-full bg-white px-3 py-1 text-gray-700 ring-1 ring-gray-200">
            اعتبار: {faNumber(data.credit)}
          </span>
        ) : null}
      </div>

      {!data.configured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          برای ارسال واقعی، <code className="mx-1">SMSIR_API_KEY</code> و{' '}
          <code className="mx-1">SMSIR_LINE_NUMBER</code> را در محیط سرور بگذارید. برای OTP قالب Verify را با{' '}
          <code className="mx-1">SMSIR_OTP_TEMPLATE_ID</code> تنظیم کنید.
        </p>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">قالب پیامک</h2>
        <p className="mt-1 text-sm text-gray-500">قالب‌های آماده عمده‌فروشی را انتخاب کنید یا متن آزاد بنویسید.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SMS_TEMPLATES.map((item) => {
            const active = templateId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pickTemplate(item.id)}
                className={`rounded-2xl border px-3 py-3 text-right ${
                  active ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600/20' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{item.hint}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Textarea
            label={templateId === 'custom' ? 'متن پیامک' : 'متن قالب (قابل ویرایش)'}
            rows={5}
            value={body}
            onChange={(e) => setCustomBody(e.target.value)}
            hint="متغیرها: {name} {amount} {discount} {payNow} {link} {brand}"
          />
          <div className="grid gap-3 content-start">
            {template.needsLink ? (
              <Input
                label="لینک"
                dir="ltr"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                hint="خالی یعنی کاتالوگ سایت"
              />
            ) : null}
            {template.needsDiscount ? (
              <Input
                label="درصد تخفیف پرداخت فوری"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            ) : null}
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-500">پیش‌نمایش</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{previewText || 'متن خالی است'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">گیرندگان</h2>
            <p className="mt-1 text-sm text-gray-500">ارسال گروهی فعلاً فقط برای ادمین فعال است.</p>
          </div>
          <p className="text-sm text-gray-500">{faNumber(selectedCount)} گیرنده</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
          {AUDIENCES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyAudience(item.id)}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                audience === item.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Input label="جستجو" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button type="button" variant="outline" onClick={selectVisible}>
            انتخاب همین فهرست
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelectedPeople([]);
              setSelectedUsers([]);
            }}
          >
            حذف انتخاب
          </Button>
        </div>
        <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {audience === 'users'
            ? users.map((row) => {
                const checked = selectedUsers.includes(row._id);
                return (
                  <button
                    key={row._id}
                    type="button"
                    onClick={() => toggleUser(row._id)}
                    className={`rounded-2xl border px-3 py-2 text-right ${
                      checked ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600/20' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="block truncate text-sm font-medium text-gray-900">{row.fullName || 'بدون نام'}</span>
                    <span className="block truncate text-xs text-gray-500" dir="ltr">
                      {row.phone}
                    </span>
                  </button>
                );
              })
            : people.map((row) => {
                const checked = selectedPeople.includes(row._id);
                return (
                  <button
                    key={row._id}
                    type="button"
                    onClick={() => togglePerson(row._id)}
                    className={`rounded-2xl border px-3 py-2 text-right ${
                      checked ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600/20' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="block truncate text-sm font-medium text-gray-900">{row.fullName || 'بدون نام'}</span>
                    <span className="block truncate text-xs text-gray-500" dir="ltr">
                      {row.phone}
                    </span>
                    <span className="mt-1 block truncate text-xs text-gray-500">
                      {[row.roleLabel, Number(row.remaining || 0) > 0 ? `مانده ${toman(row.remaining)}` : '']
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </button>
                );
              })}
        </div>
        <div className="mt-4">
          <Textarea
            label="شماره‌های اضافه"
            rows={3}
            dir="ltr"
            value={extraPhones}
            onChange={(e) => setExtraPhones(e.target.value)}
            hint="هر شماره در یک خط، یا با ویرگول جدا کنید"
          />
        </div>
        <div className="mt-4">
          <Button
            disabled={pending || !selectedCount || !body.trim()}
            onClick={send}
            icon={<Send className="h-4 w-4" />}
          >
            ارسال پیامک
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">تاریخچه ارسال</h2>
        <div className="mt-4 divide-y divide-gray-100">
          {data.history.length ? (
            data.history.map((row) => (
              <div key={String(row._id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {row.title || 'پیامک'} · {faNumber(row.sentCount || 0)} ارسال
                    {row.failedCount ? ` · ${faNumber(row.failedCount)} ناموفق` : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {faDate(row.timeStamp)} · {faNumber(row.phones?.length || 0)} شماره
                  </p>
                </div>
                {row.link ? (
                  <a href={row.link} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline" dir="ltr">
                    لینک
                  </a>
                ) : null}
              </div>
            ))
          ) : (
            <p className="flex items-center gap-2 py-6 text-sm text-gray-500">
              <MessageSquare className="h-4 w-4" />
              هنوز ارسال گروهی ثبت نشده است.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
