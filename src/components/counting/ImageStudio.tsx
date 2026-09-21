'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { buyImageTokens, editProductImage, previewImageTokenDiscount } from '@/actions/image-ai';
import {
  IMAGE_EDIT_STYLES,
  IMAGE_EDIT_TOKEN_COST,
  IMAGE_TOKEN_LIST_PRICE,
  IMAGE_TOKEN_PACKS,
  imageTokenPackById,
  tokenSavePercent,
  tokenUnitPrice,
} from '@/lib/image-tokens';
import { faDate, faNumber, toman } from '@/lib/format';
import { parseImageList } from '@/lib/shop-cart';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, FormCard, Input, Modal, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';
import { PlanLocked } from './PlanLocked';
import { Price, PriceSection } from './Price';

type DiscountPreview = {
  price: number;
  originalPrice: number;
  code: string;
  percent: number;
};

export function TokenPackCards({ canBuy = true }: { canBuy?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedPackId, setSelectedPackId] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [applied, setApplied] = useState<DiscountPreview | null>(null);
  const selectedPack = imageTokenPackById(selectedPackId);
  const catalogPrice = selectedPack?.price || 0;
  const payable = applied?.price ?? catalogPrice;

  function selectPack(packId: string) {
    setSelectedPackId(packId);
    setApplied(null);
  }

  function openCheckout() {
    if (!canBuy) {
      toast.error('فقط صاحب برند می‌تواند توکن بخرد');
      return;
    }
    if (!selectedPack) {
      toast.error('اول یکی از بسته‌ها را انتخاب کنید');
      return;
    }
    setDiscountCode(applied?.code || '');
    setCheckoutOpen(true);
  }

  function applyDiscount() {
    if (!selectedPack) return;
    const code = discountCode.trim();
    if (!code) {
      setApplied(null);
      toast.success('کد تخفیف برداشته شد');
      return;
    }
    start(async () => {
      const res = await previewImageTokenDiscount({ packId: selectedPack.id, discountCode: code });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        setApplied(null);
        toast.error(res.message || 'کد تخفیف معتبر نیست');
        return;
      }
      const data = res.data as DiscountPreview;
      setApplied(data);
      toast.success(data.percent ? `${faNumber(data.percent)}٪ تخفیف اعمال شد` : 'کد ثبت شد');
    });
  }

  function buy() {
    if (!selectedPack) return;
    start(async () => {
      const res = await buyImageTokens(selectedPack.id, discountCode.trim());
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'توکن اضافه شد');
        setCheckoutOpen(false);
        setDiscountCode('');
        setApplied(null);
        router.refresh();
      } else {
        toast.error(res.message || 'خرید انجام نشد');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {IMAGE_TOKEN_PACKS.map((pack) => {
          const save = tokenSavePercent(pack);
          const selected = selectedPackId === pack.id;
          return (
            <button
              key={pack.id}
              type="button"
              onClick={() => selectPack(pack.id)}
              aria-pressed={selected}
              className={`flex flex-col rounded-2xl border bg-white p-4 text-right shadow-sm transition ${
                selected
                  ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-600'
                  : pack.highlight
                    ? 'border-teal-200 hover:border-teal-400'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {pack.highlight ? (
                  <span className="w-fit rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                    پیشنهادی
                  </span>
                ) : null}
                {selected ? (
                  <span className="w-fit rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white">
                    انتخاب شده
                  </span>
                ) : null}
              </div>
              <h3 className="text-base font-semibold text-gray-900">{pack.name}</h3>
              <p className="mt-1 min-h-10 text-xs text-gray-500">{pack.blurb}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">{faNumber(pack.tokens)}</p>
              <p className="text-sm text-gray-500">توکن · هر تصویر یک توکن</p>
              <PriceSection
                className="mt-3"
                label="قیمت بسته"
                value={pack.price}
                description={
                  <>
                    <Price value={tokenUnitPrice(pack)} /> برای هر ویرایش تصویر
                    {save ? (
                      <span className="mt-1 block text-teal-700">
                        {faNumber(save)}٪ ارزان‌تر از خرید تکی <Price value={IMAGE_TOKEN_LIST_PRICE} />
                      </span>
                    ) : (
                      <span className="mt-1 block text-gray-400">قیمت پایه هر توکن</span>
                    )}
                  </>
                }
              />
              <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  هر توکن = ویرایش یک تصویر
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  پس‌زمینه سفید، استودیو و عکس مربعی کاتالوگ
                </li>
              </ul>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button disabled={pending} onClick={openCheckout}>
          {canBuy ? 'ادامه خرید' : 'فقط صاحب برند'}
        </Button>
      </div>

      <Modal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} size="md" rounded="lg" title="کد تخفیف">
        <FormCard className="border-0 shadow-none rounded-[inherit]">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {selectedPack
                ? `${selectedPack.name} · ${faNumber(selectedPack.tokens)} توکن · ${toman(catalogPrice)}`
                : 'بسته‌ای انتخاب نشده'}
            </p>
            <p className="text-xs text-gray-500">هر توکن برای ویرایش یک تصویر مصرف می‌شود.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label="کد تخفیف"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value);
                    setApplied(null);
                  }}
                />
              </div>
              <Button variant="outline" disabled={pending} onClick={applyDiscount}>
                اعمال تخفیف
              </Button>
            </div>
            {applied?.percent ? (
              <PriceSection
                label="مبلغ قابل پرداخت"
                value={applied.price}
                description={
                  <>
                    {faNumber(applied.percent)}٪ تخفیف با کد {applied.code}: از <Price value={applied.originalPrice} /> به{' '}
                    <Price value={applied.price} />
                  </>
                }
              />
            ) : (
              <PriceSection label="مبلغ قابل پرداخت" value={payable} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={pending} onClick={() => setCheckoutOpen(false)}>
                انصراف
              </Button>
              <Button disabled={pending || !selectedPack} onClick={buy}>
                پرداخت و افزودن توکن
              </Button>
            </div>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}

export function ImageEditModal({
  clothId,
  images,
  initialImageUrl,
  onClose,
  onSuccess,
}: {
  clothId: string;
  images: string[];
  initialImageUrl?: string;
  onClose: () => void;
  onSuccess?: (images: string[]) => void;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [pending, start] = useTransition();
  const [imageUrl, setImageUrl] = useState(initialImageUrl && images.includes(initialImageUrl) ? initialImageUrl : images[0] || '');
  const [styleId, setStyleId] = useState(IMAGE_EDIT_STYLES[0].id);
  const tokens = Number(workspace?.imageTokens || 0);
  const unlimited = Boolean(workspace?.imageTokensUnlimited);

  function run() {
    start(async () => {
      const res = await editProductImage({ clothId, imageUrl, styleId });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        const nextImages = Array.isArray((res.data as { images?: string[] } | null)?.images)
          ? ((res.data as { images: string[] }).images)
          : [];
        toast.success(res.message || 'تصویر آماده شد');
        onSuccess?.(nextImages);
        onClose();
        router.refresh();
      } else {
        toast.error(res.message || 'ویرایش انجام نشد');
      }
    });
  }

  return (
    <Modal isOpen onClose={onClose} size="lg" rounded="lg" title="ویرایش تصویر با هوش مصنوعی">
      <FormCard className="border-0 shadow-none rounded-[inherit]">
        <div className="mb-4 space-y-1">
          <p className="text-sm text-gray-500">
            هر تصویر دقیقاً {faNumber(IMAGE_EDIT_TOKEN_COST)} توکن مصرف می‌کند.
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
              {pending ? 'در حال ساخت…' : `ساخت تصویر · ${faNumber(IMAGE_EDIT_TOKEN_COST)} توکن`}
            </Button>
          </div>
        </div>
      </FormCard>
    </Modal>
  );
}

export function ClothImageStudio({
  clothId,
  images,
  imageUrl,
  label = 'ویرایش با هوش مصنوعی',
  className,
  compact,
  onSuccess,
}: {
  clothId: string;
  images: string[];
  imageUrl?: string;
  label?: string;
  className?: string;
  compact?: boolean;
  onSuccess?: (images: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => parseImageList(images), [images]);
  if (!list.length) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:border-gray-300'
        }
      >
        <Sparkles className={compact ? 'size-3' : 'size-4'} />
        {label}
      </button>
      {open ? (
        <ImageEditModal
          clothId={clothId}
          images={list}
          initialImageUrl={imageUrl}
          onClose={() => setOpen(false)}
          onSuccess={onSuccess}
        />
      ) : null}
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
  const allowImages = Boolean(workspace?.isPlatformAdmin || workspace?.subscription?.allowClothImages);
  const products = clothes
    .map((row) => ({ ...row, images: parseImageList(row.images) }))
    .filter((row) => row.images.length);

  return (
    <div className="space-y-6">
      {allowImages ? null : (
        <PlanLocked
          title="تصویر محصول"
          what="عکس لباس را روی محصول می‌گذارید و با توکن پس‌زمینه یا کاتالوگ می‌سازید. این کار فقط در طرح ویترین است. طرح پایه همان فاکتور، البسه و پارچه را می‌دهد."
          planHint="ویترین"
        />
      )}
      {allowImages ? (
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
      ) : null}

      {allowImages ? (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">خرید توکن</h2>
              <p className="text-sm text-gray-500">یک بسته را انتخاب کنید، بعد با یک دکمه ادامه دهید. هر توکن یک تصویر را ویرایش می‌کند.</p>
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
        </>
      ) : null}
    </div>
  );
}
