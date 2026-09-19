'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Copy, Link2, MessageSquare, Trash2 } from 'lucide-react';
import { createProductShare, deleteProductShare, sendProductShareSms } from '@/actions/share';
import { displayName, faDate, faNumber } from '@/lib/format';
import { parseImageList } from '@/lib/shop-cart';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { ProductShare } from '@/lib/types';
import { Button, FormCard, Input, Modal, Textarea, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';

function sharePath(token: string) {
  return `/s/${token}`;
}

function personPhone(row: Record<string, any>) {
  const raw = row.phoneNumber ?? row.phonenumber;
  if (Array.isArray(raw)) return String(raw[0] || '').trim();
  return String(raw || '').trim();
}

export function buildShareSmsText(customerName: string, url: string) {
  const name = customerName.trim() || 'مشتری گرامی';
  return [
    `سلام جناب ${name}،`,
    '',
    'لینک لباس‌های درخواستی جهت مشاهده خدمت شما ارسال شد:',
    url,
    '',
    'در صورت نیاز به راهنمایی، در خدمتیم.',
  ].join('\n');
}

export function ShareLinksBoard({
  clothes,
  shares,
  customers = [],
}: {
  clothes: Record<string, any>[];
  shares: ProductShare[];
  customers?: Record<string, any>[];
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const allowShare = Boolean(workspace?.isPlatformAdmin || workspace?.subscription?.allowProductShare);
  const allowSms = Boolean(workspace?.isPlatformAdmin || workspace?.subscription?.allowShareSms);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [smsModal, setSmsModal] = useState<{ shareId: string; token: string; title: string } | null>(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsText, setSmsText] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerQ, setCustomerQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim();
    return clothes.filter((row) => {
      if (!term) return true;
      const hay = [row.code, displayName(row._type), displayName(row._style), displayName(row._size)]
        .join(' ')
        .toLowerCase();
      return hay.includes(term.toLowerCase());
    });
  }, [clothes, q]);

  const filteredCustomers = useMemo(() => {
    const term = customerQ.trim().toLowerCase();
    return customers.filter((row) => {
      if (!term) return true;
      const hay = [row.fullName, personPhone(row), row.city].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [customers, customerQ]);

  function shareUrlForToken(token: string) {
    if (typeof window === 'undefined') return sharePath(token);
    return `${window.location.origin}${sharePath(token)}`;
  }

  function openSmsModal(share: ProductShare) {
    if (!allowSms) {
      toast.error('ارسال پیامک لینک در طرح فروشگاه‌ها و بالاتر است');
      return;
    }
    const url = shareUrlForToken(share.token);
    setSmsModal({ shareId: share._id, token: share.token, title: share.title || 'لینک محصولات' });
    setCustomerId('');
    setCustomerQ('');
    setSmsPhone('');
    setSmsText(buildShareSmsText('', url));
  }

  function closeSmsModal() {
    setSmsModal(null);
    setCustomerId('');
    setCustomerQ('');
    setSmsPhone('');
    setSmsText('');
  }

  function selectCustomer(row: Record<string, any>) {
    if (!smsModal) return;
    const id = String(row._id);
    const url = shareUrlForToken(smsModal.token);
    const name = String(row.fullName || '').trim();
    const number = personPhone(row);
    setCustomerId(id);
    setSmsPhone(number);
    setSmsText(buildShareSmsText(name, url));
  }

  function onPhoneChange(value: string) {
    setSmsPhone(value);
    if (customerId) {
      const selectedCustomer = customers.find((row) => String(row._id) === customerId);
      if (selectedCustomer && personPhone(selectedCustomer) !== value.trim()) {
        setCustomerId('');
      }
    }
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function create(withSms = false) {
    if (!allowShare) {
      toast.error('ساخت لینک محصول در طرح اشتراک شما نیست');
      return;
    }
    if (!selected.length) {
      toast.error('حداقل یک لباس انتخاب کنید');
      return;
    }
    if (withSms && !phone.trim()) {
      toast.error('شماره موبایل را وارد کنید');
      return;
    }
    start(async () => {
      const res = await createProductShare({ title, clothIds: selected, phone: withSms ? phone.trim() : undefined });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        toast.error(res.message || 'لینک ساخته نشد');
        return;
      }
      const token = String((res.data as { token?: string }).token || '');
      const url = shareUrlForToken(token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success(withSms ? res.message || 'لینک ساخته و پیامک شد' : 'لینک ساخته شد و کپی شد');
      } catch {
        toast.success(res.message || 'لینک ساخته شد');
      }
      setSelected([]);
      setTitle('');
      router.refresh();
    });
  }

  function copy(token: string) {
    const url = shareUrlForToken(token);
    navigator.clipboard.writeText(url).then(
      () => toast.success('لینک کپی شد'),
      () => toast.error('کپی نشد'),
    );
  }

  function sendSms() {
    if (!smsModal) return;
    if (!smsPhone.trim()) {
      toast.error('شماره موبایل را وارد کنید یا مشتری انتخاب کنید');
      return;
    }
    if (!smsText.trim()) {
      toast.error('متن پیامک را وارد کنید');
      return;
    }
    start(async () => {
      const res = await sendProductShareSms({
        shareId: smsModal.shareId,
        phone: smsPhone.trim(),
        message: smsText.trim(),
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'پیامک ارسال شد');
        closeSmsModal();
      } else {
        toast.error(res.message || 'پیامک ارسال نشد');
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteProductShare(id);
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'حذف شد');
        router.refresh();
      } else {
        toast.error(res.message || 'حذف نشد');
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">ساخت لینک برای مشتری</h2>
            <p className="mt-1 text-sm text-gray-500">
              لباس‌ها را انتخاب کنید. مشتری فقط همین مدل‌ها را می‌بیند، از سبد سفارش می‌دهد و می‌تواند به همه محصولات برود.
            </p>
          </div>
          <p className="text-sm text-gray-500">{faNumber(selected.length)} انتخاب‌شده</p>
        </div>
        {!allowShare ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            ساخت لینک محصول بخشی از اشتراک است.{' '}
            <Link href="/counting/profile?tab=subscription" className="underline">
              طرح را ببینید یا ارتقا دهید
            </Link>
            .
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="عنوان لینک (اختیاری)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input
            label="شماره موبایل برای پیامک هنگام ساخت"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0912xxxxxxx"
            disabled={!allowSms}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={pending || !selected.length || !allowShare} onClick={() => create(false)} icon={<Link2 className="h-4 w-4" />}>
            ساخت و کپی لینک
          </Button>
          <Button
            variant="outline"
            disabled={pending || !selected.length || !allowShare || !allowSms}
            onClick={() => create(true)}
            icon={<MessageSquare className="h-4 w-4" />}
          >
            ساخت و ارسال پیامک
          </Button>
          {!allowSms ? (
            <p className="self-center text-xs text-gray-500">ارسال پیامک از طرح فروشگاه‌ها به بالاست.</p>
          ) : null}
        </div>
        <div className="mt-4">
          <Input label="جستجو در لباس‌ها" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => {
            const id = String(row._id);
            const checked = selected.includes(id);
            const image = parseImageList(row.images)[0];
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={`flex items-center gap-3 rounded-2xl border p-2 text-right ${
                  checked ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600/20' : 'border-gray-200 bg-white'
                }`}
              >
                <span
                  className="h-14 w-12 shrink-0 rounded-xl bg-gray-100 bg-cover bg-center"
                  style={image ? { backgroundImage: `url(${image})` } : undefined}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">کد {row.code || '—'}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {[displayName(row._type), displayName(row._style), displayName(row._size)]
                      .filter((part) => part && part !== '—')
                      .join(' · ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {!filtered.length ? (
          <p className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            لباسی برای انتخاب نیست
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">لینک‌های ساخته‌شده</h3>
          <p className="mt-1 text-xs text-gray-500">برای ارسال به مشتری، روی «ارسال به شماره» کلیک کنید.</p>
        </div>
        {shares.length ? (
          <ul className="divide-y divide-gray-100">
            {shares.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.title || 'لینک محصولات'}</p>
                  <p className="text-xs text-gray-500">
                    {faNumber(row.clothCount || row._clothIds.length)} لباس · {faDate(row.timeStamp)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" icon={<Copy className="h-4 w-4" />} onClick={() => copy(row.token)}>
                    کپی لینک
                  </Button>
                  {allowSms ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      icon={<MessageSquare className="h-4 w-4" />}
                      onClick={() => openSmsModal(row)}
                    >
                      ارسال به شماره
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(row._id)} aria-label="حذف لینک">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-gray-500">هنوز لینکی ساخته نشده</p>
        )}
      </section>

      <Modal isOpen={Boolean(smsModal)} onClose={closeSmsModal} size="lg">
        <FormCard>
          <h3 className="mb-1 text-lg font-medium">ارسال لینک با پیامک</h3>
          <p className="mb-4 text-sm text-gray-500">
            {smsModal?.title || 'لینک محصولات'} — شماره را بنویسید یا از لیست مشتریان انتخاب کنید و متن را در صورت نیاز ویرایش کنید.
          </p>

          <div className="space-y-4">
            <Input
              label="شماره موبایل"
              value={smsPhone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="0912xxxxxxx"
            />

            <div>
              <p className="mb-2 text-sm font-medium text-gray-800">انتخاب از مشتریان</p>
              <Input
                label="جستجوی مشتری"
                value={customerQ}
                onChange={(e) => setCustomerQ(e.target.value)}
                placeholder="نام یا موبایل"
              />
              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-gray-100 p-1">
                {filteredCustomers.length ? (
                  filteredCustomers.map((row) => {
                    const id = String(row._id);
                    const checked = customerId === id;
                    const number = personPhone(row);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => selectCustomer(row)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right text-sm ${
                          checked ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-600/20' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium">{row.fullName || 'بدون نام'}</span>
                        <span className="shrink-0 text-xs text-gray-500" dir="ltr">
                          {number || 'بدون شماره'}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-4 text-center text-xs text-gray-500">مشتری‌ای پیدا نشد</p>
                )}
              </div>
            </div>

            <Textarea
              label="متن پیامک"
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              rows={7}
              className="min-h-[9rem]"
            />

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={closeSmsModal} disabled={pending}>
                انصراف
              </Button>
              <Button onClick={sendSms} disabled={pending || !smsPhone.trim() || !smsText.trim()} icon={<MessageSquare className="h-4 w-4" />}>
                ارسال پیامک
              </Button>
            </div>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}
