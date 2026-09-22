'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, UserPlus } from 'lucide-react';
import { invitePeopleToTelegramChannel, publishClothesToTelegram } from '@/actions/telegram';
import { displayName, faDate, faNumber } from '@/lib/format';
import { parseImageList } from '@/lib/shop-cart';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Input, toast } from '@/ui';

export type TelegramBoardData = {
  configured: boolean;
  clothes: Record<string, any>[];
  people: Record<string, any>[];
  history: Record<string, any>[];
  invites: Record<string, any>[];
};

function personPhone(row: Record<string, any>) {
  const raw = row.phoneNumber ?? row.phonenumber;
  if (Array.isArray(raw)) return String(raw[0] || '');
  return String(raw || '');
}

export function TelegramPublishBoard({ data }: { data: TelegramBoardData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [clothQ, setClothQ] = useState('');
  const [personQ, setPersonQ] = useState('');
  const [selectedClothes, setSelectedClothes] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  const clothes = useMemo(() => {
    const term = clothQ.trim().toLowerCase();
    return data.clothes.filter((row) => {
      if (!term) return true;
      const hay = [row.code, displayName(row._type), displayName(row._style), displayName(row._size), displayName(row._color)]
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [data.clothes, clothQ]);

  const people = useMemo(() => {
    const term = personQ.trim().toLowerCase();
    return data.people.filter((row) => {
      if (!term) return true;
      const hay = [row.fullName, personPhone(row), row.city].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [data.people, personQ]);

  function toggleCloth(id: string) {
    setSelectedClothes((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function togglePerson(id: string) {
    setSelectedPeople((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function publish() {
    if (!selectedClothes.length) {
      toast.error('حداقل یک لباس انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await publishClothesToTelegram({ clothIds: selectedClothes });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'منتشر شد');
        setSelectedClothes([]);
        router.refresh();
      } else {
        toast.error(res.message || 'انتشار ناموفق بود');
      }
    });
  }

  function invite() {
    if (!selectedPeople.length) {
      toast.error('حداقل یک شخص انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await invitePeopleToTelegramChannel({ personIds: selectedPeople });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'دعوت ارسال شد');
        setSelectedPeople([]);
        router.refresh();
      } else {
        toast.error(res.message || 'دعوت ارسال نشد');
      }
    });
  }

  return (
    <div className="space-y-6">
      {!data.configured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          برای ارسال، <code className="mx-1">TELEGRAM_BOT_TOKEN</code> و{' '}
          <code className="mx-1">TELEGRAM_CHANNEL_ID</code> را در <code className="mx-1">.env.local</code> بگذارید و سرور
          را ری‌استارت کنید. شناسه کانال معمولاً شبیه <code className="mx-1">@mychannel</code> یا{' '}
          <code className="mx-1">-100…</code> است و ربات باید ادمین کانال باشد.
        </p>
      ) : (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950">
          ربات و کانال تنظیم شده‌اند. پست‌ها واقعاً به تلگرام ارسال می‌شوند. اگر خطا دیدید، ادمین بودن ربات و عمومی بودن
          آدرس تصویر را چک کنید.
        </p>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">انتشار لباس در کانال تلگرام</h2>
            <p className="mt-1 text-sm text-gray-500">
              لباس‌ها را انتخاب کنید و منتشر کنید. می‌توانید چندبار برای همان لباس پست بگذارید. کپشن شامل سایز، رنگ، کد و لینک سفارش است.
            </p>
          </div>
          <p className="text-sm text-gray-500">{faNumber(selectedClothes.length)} انتخاب‌شده</p>
        </div>
        <div className="mt-4">
          <Input label="جستجو در لباس‌ها" value={clothQ} onChange={(e) => setClothQ(e.target.value)} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {clothes.map((row) => {
            const id = String(row._id);
            const checked = selectedClothes.includes(id);
            const image = parseImageList(row.images)[0];
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleCloth(id)}
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
                    {[displayName(row._size), displayName(row._color), row.published ? 'وب‌سایت' : 'پیش‌نویس']
                      .filter((part) => part && part !== '—')
                      .join(' · ')}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Button disabled={pending || !selectedClothes.length} onClick={publish} icon={<Send className="h-4 w-4" />}>
            انتشار در تلگرام
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">دعوت اشخاص به کانال</h2>
            <p className="mt-1 text-sm text-gray-500">
              اشخاص را انتخاب کنید تا لینک عضویت کانال تلگرام برایشان پیامک شود.
            </p>
          </div>
          <p className="text-sm text-gray-500">{faNumber(selectedPeople.length)} انتخاب‌شده</p>
        </div>
        <div className="mt-4">
          <Input label="جستجو در اشخاص" value={personQ} onChange={(e) => setPersonQ(e.target.value)} />
        </div>
        <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {people.map((row) => {
            const id = String(row._id);
            const checked = selectedPeople.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => togglePerson(id)}
                className={`rounded-2xl border px-3 py-2 text-right ${
                  checked ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-600/20' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="block truncate text-sm font-medium text-gray-900">{row.fullName || 'بدون نام'}</span>
                <span className="block truncate text-xs text-gray-500" dir="ltr">
                  {personPhone(row) || 'بدون موبایل'}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Button
            variant="outline"
            disabled={pending || !selectedPeople.length}
            onClick={invite}
            icon={<UserPlus className="h-4 w-4" />}
          >
            ارسال دعوت تلگرام
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">تاریخچه انتشار در کانال</h2>
        <div className="mt-4 divide-y divide-gray-100">
          {data.history.length ? (
            data.history.map((row) => (
              <div key={String(row._id)} className="flex flex-wrap items-start gap-3 py-3">
                <span
                  className="h-14 w-12 shrink-0 rounded-xl bg-gray-100 bg-cover bg-center"
                  style={row.imageUrl ? { backgroundImage: `url(${row.imageUrl})` } : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    کد {row.code || '—'} · {row.sizeName || '—'} · {row.colorName || '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {faDate(row.timeStamp)} · {row.status === 'sent' ? 'ارسال‌شده' : `ناموفق${row.error ? ` — ${row.error}` : ''}`}
                  </p>
                  {row.orderUrl ? (
                    <a href={row.orderUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-teal-700 underline">
                      لینک سفارش
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-sm text-gray-500">هنوز پستی در تلگرام ثبت نشده است.</p>
          )}
        </div>
      </section>

      {data.invites.length ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">تاریخچه دعوت‌ها</h2>
          <div className="mt-4 divide-y divide-gray-100">
            {data.invites.map((row) => (
              <div key={String(row._id)} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {faNumber(row.sentCount || 0)} ارسال · {faNumber(row.failedCount || 0)} ناموفق
                  </p>
                  <p className="text-xs text-gray-500">{faDate(row.timeStamp)}</p>
                </div>
                {row.inviteLink ? (
                  <a href={row.inviteLink} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline" dir="ltr">
                    لینک دعوت
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
