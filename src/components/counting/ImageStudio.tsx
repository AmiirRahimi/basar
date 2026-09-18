'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { buyImageTokens, editProductImage } from '@/actions/image-ai';
import {
  IMAGE_EDIT_STYLES,
  IMAGE_TOKEN_LIST_PRICE,
  IMAGE_TOKEN_PACKS,
  tokenSavePercent,
  tokenUnitPrice,
} from '@/lib/image-tokens';
import { faDate, faNumber, toman } from '@/lib/format';
import { parseImageList } from '@/lib/shop-cart';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, FormCard, Modal, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';

export function TokenPackCards({ canBuy = true }: { canBuy?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function buy(packId: string) {
    start(async () => {
      const res = await buyImageTokens(packId);
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'توکن اضافه شد');
        router.refresh();
      } else {
        toast.error(res.message || 'خرید انجام نشد');
      }
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {IMAGE_TOKEN_PACKS.map((pack) => {
        const save = tokenSavePercent(pack);
        return (
          <article
            key={pack.id}
            className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
              pack.highlight ? 'border-teal-600 ring-1 ring-teal-600' : 'border-gray-200'
            }`}
          >
            {pack.highlight ? (
              <span className="mb-2 w-fit rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                پیشنهادی
              </span>
            ) : (
              <span className="mb-2 w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {pack.name}
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{pack.name}</h3>
            <p className="mt-1 min-h-10 text-sm text-gray-500">{pack.blurb}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">{faNumber(pack.tokens)}</p>
            <p className="text-sm text-gray-500">توکن ویرایش تصویر</p>
            <p className="mt-3 text-xl font-semibold text-gray-900">{toman(pack.price)}</p>
            <p className="text-xs text-gray-500">{toman(tokenUnitPrice(pack))} برای هر ویرایش</p>
            {save ? (
              <p className="mt-1 text-xs text-teal-700">
                {faNumber(save)}٪ ارزان‌تر از خرید تکی {toman(IMAGE_TOKEN_LIST_PRICE)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">قیمت پایه هر توکن</p>
            )}
            <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                هر توکن = یک ویرایش تصویر محصول
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                پس‌زمینه سفید، استودیو و عکس مربعی کاتالوگ
              </li>
            </ul>
            <Button className="mt-5 w-full" disabled={pending || !canBuy} onClick={() => buy(pack.id)}>
              {canBuy ? 'خرید بسته' : 'فقط صاحب برند'}
            </Button>
          </article>
        );
      })}
    </div>
  );
}

export function ImageEditModal({
  clothId,
  images,
  onClose,
}: {
  clothId: string;
  images: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [pending, start] = useTransition();
  const [imageUrl, setImageUrl] = useState(images[0] || '');
  const [styleId, setStyleId] = useState(IMAGE_EDIT_STYLES[0].id);
  const tokens = Number(workspace?.imageTokens || 0);
  const unlimited = Boolean(workspace?.imageTokensUnlimited);
  const style = IMAGE_EDIT_STYLES.find((item) => item.id === styleId) || IMAGE_EDIT_STYLES[0];

  function run() {
    start(async () => {
      const res = await editProductImage({ clothId, imageUrl, styleId });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'تصویر آماده شد');
        onClose();
        router.refresh();
      } else {
        toast.error(res.message || 'ویرایش انجام نشد');
      }
    });
  }

  return (
    <Modal isOpen onClose={onClose} size="lg" rounded="lg">
      <FormCard>
        <div className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">ویرایش تصویر با هوش مصنوعی</h3>
          <p className="text-sm text-gray-500">
            هر جلوه {faNumber(style.tokenCost)} توکن مصرف می‌کند.
            {unlimited ? ' حساب ادمین محدودیتی ندارد.' : ` مانده: ${faNumber(tokens)} توکن.`}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {images.map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => setImageUrl(src)}
              className={`overflow-hidden rounded-2xl border ${
                imageUrl === src ? 'border-teal-600 ring-2 ring-teal-600/30' : 'border-gray-200'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-28 w-full object-cover" />
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {IMAGE_EDIT_STYLES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStyleId(item.id)}
              className={`rounded-2xl border p-3 text-right ${
                styleId === item.id ? 'border-teal-600 bg-teal-50/60' : 'border-gray-200 bg-white'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{item.blurb}</p>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Link href="/counting/images" className="text-sm text-teal-800 hover:underline">
            خرید توکن
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={onClose}>
              انصراف
            </Button>
            <Button disabled={pending || !imageUrl} onClick={run}>
              {pending ? 'در حال ساخت…' : `ساخت تصویر · ${faNumber(style.tokenCost)} توکن`}
            </Button>
          </div>
        </div>
      </FormCard>
    </Modal>
  );
}

export function ClothImageStudio({ clothId, images }: { clothId: string; images: string[] }) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => parseImageList(images), [images]);
  if (!list.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:border-gray-300"
      >
        <Sparkles className="size-4" />
        ویرایش با هوش مصنوعی
      </button>
      {open ? <ImageEditModal clothId={clothId} images={list} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function ImageStudioBoard({
  clothes,
  purchases = [],
  edits = [],
}: {
  clothes: { _id: string; code?: string; images?: unknown }[];
  purchases?: { _id: string; packId?: string; tokens?: number; price?: number; timeStamp?: string }[];
  edits?: { _id: string; resultUrl?: string; sourceUrl?: string; styleId?: string; timeStamp?: string }[];
}) {
  const workspace = useWorkspace();
  const [editing, setEditing] = useState<{ clothId: string; images: string[] } | null>(null);
  const tokens = Number(workspace?.imageTokens || 0);
  const unlimited = Boolean(workspace?.imageTokensUnlimited);
  const canBuy = workspace?.storeRole === 'owner' || Boolean(workspace?.isPlatformAdmin);
  const products = clothes
    .map((row) => ({ ...row, images: parseImageList(row.images) }))
    .filter((row) => row.images.length);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">مانده توکن تصویر</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">
              {unlimited ? 'نامحدود' : faNumber(tokens)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              هر ویرایش یک توکن است. پس‌زمینه سفید، نور استودیو یا کادر مربعی کاتالوگ را انتخاب کنید.
            </p>
          </div>
          <Sparkles className="h-10 w-10 text-teal-700" />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">خرید توکن</h2>
          <p className="text-sm text-gray-500">بسته‌های بزرگ‌تر ارزان‌تر تمام می‌شوند.</p>
        </div>
        <TokenPackCards canBuy={canBuy} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">محصولات این فروشگاه</h2>
          <p className="text-sm text-gray-500">روی یک عکس بزنید تا پس‌زمینه سفید یا جلوه استودیو بسازید.</p>
        </div>
        {products.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((row) => (
              <button
                key={row._id}
                type="button"
                onClick={() => setEditing({ clothId: row._id, images: row.images })}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-right shadow-sm hover:border-gray-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.images[0]} alt="" className="h-44 w-full object-cover" />
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">کد {row.code || '—'}</p>
                  <p className="text-xs text-gray-500">{faNumber(row.images.length)} تصویر</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            هنوز تصویری روی لباس‌ها نیست. در البسه آدرس تصویر را ثبت کنید، بعد اینجا ویرایش کنید.
          </p>
        )}
      </section>

      {edits.length ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">ویرایش‌های اخیر</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 lg:grid-cols-6">
            {edits.map((row) => (
              <div key={row._id} className="overflow-hidden rounded-xl border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.resultUrl} alt="" className="h-24 w-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {purchases.length ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">خریدهای توکن</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {purchases.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">{faNumber(row.tokens)} توکن</p>
                <p className="text-gray-500">{faDate(row.timeStamp)}</p>
                <p className="font-medium">{toman(row.price)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {editing ? (
        <ImageEditModal clothId={editing.clothId} images={editing.images} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
