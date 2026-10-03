'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Eye, EyeOff, Sparkles, Trash2 } from 'lucide-react';
import {
  buyImageTokens,
  editProductImage,
  generateClothOnModel,
  previewImageTokenDiscount,
  updateClothImageLibrary,
} from '@/actions/image-ai';
import {
  modelPresetSample,
  modelSceneSample,
  studioStyleSample,
} from '@/lib/ai-image-samples';
import {
  aiStyleLabel,
  countShownInLibrary,
  normalizeClothImageLibrary,
  removeGeneratedFromLibrary,
  removeGroupFromLibrary,
  shownUrlsFromLibrary,
  toggleShownInLibrary,
  type ClothImageGroup,
} from '@/lib/cloth-images';
import {
  IMAGE_EDIT_STYLES,
  IMAGE_EDIT_TOKEN_COST,
  IMAGE_TOKEN_AMOUNTS,
  IMAGE_TOKEN_UNIT_PRICE,
  imageTokenPrice,
  type ImageEditStyleId,
} from '@/lib/image-tokens';
import { faDate, faNumber, toman } from '@/lib/format';
import { MAX_CLOTH_IMAGES, parseImageList } from '@/lib/shop-cart';
import { MAX_VIRTUAL_MODEL_IMAGES, PHOTOROOM_MODELS, PHOTOROOM_POSES, PHOTOROOM_SCENES } from '@/lib/photoroom';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { ApiWait, Button, DeletePopover, FormCard, Input, Modal, Select, Tabs, cn, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';
import { PlanLocked } from './PlanLocked';
import { Price, PriceSection } from './Price';

export type ImageEditSuccess = {
  images: string[];
  imageLibrary?: unknown;
  resultUrl?: string;
};

type DiscountPreview = {
  price: number;
  originalPrice: number;
  code: string;
  percent: number;
};

const DEFAULT_TOKEN_STEP = IMAGE_TOKEN_AMOUNTS.indexOf(50) >= 0 ? IMAGE_TOKEN_AMOUNTS.indexOf(50) : 2;

export function TokenPackCards({ canBuy = true }: { canBuy?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [previewing, startPreview] = useTransition();
  const [stepIndex, setStepIndex] = useState(DEFAULT_TOKEN_STEP);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [applied, setApplied] = useState<DiscountPreview | null>(null);

  const tokens = IMAGE_TOKEN_AMOUNTS[stepIndex] ?? IMAGE_TOKEN_AMOUNTS[0];
  const catalogPrice = imageTokenPrice(tokens);
  const payable = applied?.price ?? catalogPrice;
  const progress =
    IMAGE_TOKEN_AMOUNTS.length > 1 ? (stepIndex / (IMAGE_TOKEN_AMOUNTS.length - 1)) * 100 : 0;

  function setStep(next: number) {
    const clamped = Math.max(0, Math.min(IMAGE_TOKEN_AMOUNTS.length - 1, next));
    setStepIndex(clamped);
    setApplied(null);
  }

  function setTokensByAmount(amount: number) {
    const next = IMAGE_TOKEN_AMOUNTS.indexOf(amount as (typeof IMAGE_TOKEN_AMOUNTS)[number]);
    if (next < 0) return;
    setStep(next);
  }

  function openCheckout() {
    if (!canBuy) {
      toast.error('فقط صاحب برند می‌تواند توکن بخرد');
      return;
    }
    setDiscountCode(applied?.code || '');
    setCheckoutOpen(true);
  }

  function applyDiscount() {
    const code = discountCode.trim();
    if (!code) {
      setApplied(null);
      toast.success('کد تخفیف برداشته شد');
      return;
    }
    startPreview(async () => {
      const res = await previewImageTokenDiscount({ tokens, discountCode: code });
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
    start(async () => {
      const res = await buyImageTokens(tokens, discountCode.trim());
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        const redirectUrl = (res.data as { redirectUrl?: string } | null)?.redirectUrl;
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
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
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">تعداد توکن</p>
          <p
            key={tokens}
            className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 transition-all duration-300 ease-out"
          >
            {faNumber(tokens)}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            هر توکن = ویرایش یک تصویر · هر توکن {toman(IMAGE_TOKEN_UNIT_PRICE)}
          </p>
        </div>
        <PriceSection label="مبلغ" value={catalogPrice} className="min-w-[10rem] transition-all duration-300" />
      </div>

      <div className="space-y-3" dir="rtl">
        <div className="relative mx-2.5">
          {IMAGE_TOKEN_AMOUNTS.map((amount, index) => {
            const offset =
              IMAGE_TOKEN_AMOUNTS.length > 1 ? (index / (IMAGE_TOKEN_AMOUNTS.length - 1)) * 100 : 0;
            const active = index === stepIndex;
            const reached = index <= stepIndex;
            return (
              <button
                key={amount}
                type="button"
                onClick={() => setTokensByAmount(amount)}
                className={cn(
                  'absolute top-0 translate-x-1/2 text-xs transition-all duration-300 ease-out sm:text-sm',
                  active
                    ? 'font-semibold text-teal-800'
                    : reached
                      ? 'font-medium text-teal-700/75 hover:text-teal-800'
                      : 'text-gray-400 hover:text-gray-600',
                )}
                style={{ right: `${offset}%` }}
              >
                {faNumber(amount)}
              </button>
            );
          })}
          <div className="h-5" />
        </div>

        <div className="relative mx-2.5 h-8 select-none">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="ml-auto h-full rounded-full bg-gradient-to-l from-teal-700 to-teal-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {IMAGE_TOKEN_AMOUNTS.map((amount, index) => {
            const offset =
              IMAGE_TOKEN_AMOUNTS.length > 1 ? (index / (IMAGE_TOKEN_AMOUNTS.length - 1)) * 100 : 0;
            const reached = index <= stepIndex;
            return (
              <span
                key={amount}
                className={cn(
                  'pointer-events-none absolute top-1/2 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300',
                  reached ? 'bg-teal-700' : 'bg-gray-300 dark:bg-gray-600',
                )}
                style={{ right: `${offset}%` }}
              />
            );
          })}

          <div
            className="pointer-events-none absolute top-1/2 z-[1] size-5 translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-teal-600 bg-white shadow-[0_2px_8px_rgba(15,118,110,0.22)] transition-all duration-300 ease-out dark:bg-gray-900"
            style={{ right: `${progress}%` }}
          />

          <input
            type="range"
            min={0}
            max={IMAGE_TOKEN_AMOUNTS.length - 1}
            step={1}
            value={stepIndex}
            onChange={(event) => setStep(Number(event.target.value))}
            aria-label="تعداد توکن"
            aria-valuemin={IMAGE_TOKEN_AMOUNTS[0]}
            aria-valuemax={IMAGE_TOKEN_AMOUNTS[IMAGE_TOKEN_AMOUNTS.length - 1]}
            aria-valuenow={tokens}
            dir="rtl"
            className="absolute inset-0 z-[2] w-full cursor-pointer opacity-0"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button disabled={pending} onClick={openCheckout}>
          {canBuy ? 'ادامه خرید' : 'فقط صاحب برند'}
        </Button>
      </div>

      <Modal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} size="md" rounded="lg" title="خرید توکن تصویر">
        <FormCard className="border-0 shadow-none rounded-[inherit]">
          <div className="space-y-4">
            <div className="rounded-xl bg-teal-50/80 px-3 py-3 text-sm text-teal-950">
              <p className="font-medium">
                {faNumber(tokens)} توکن · {toman(catalogPrice)}
              </p>
              <p className="mt-1 text-xs text-teal-900/80">
                هر توکن یک تصویر را ویرایش می‌کند. قیمت هر توکن {toman(IMAGE_TOKEN_UNIT_PRICE)} است.
              </p>
            </div>
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
              <Button variant="outline" disabled={previewing || pending} onClick={applyDiscount}>
                اعمال تخفیف
              </Button>
            </div>
            {previewing ? (
              <ApiWait compact title="در حال بررسی کد تخفیف…" />
            ) : applied?.percent ? (
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
              <Button disabled={pending || previewing} onClick={buy}>
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
  onLibraryChange,
}: {
  clothId?: string;
  images: string[];
  initialImageUrl?: string;
  onClose: () => void;
  onSuccess?: (payload: ImageEditSuccess) => void;
  onLibraryChange?: (library: unknown) => void;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [mode, setMode] = useState<'model' | 'studio'>('model');
  const [imageUrl, setImageUrl] = useState(initialImageUrl && images.includes(initialImageUrl) ? initialImageUrl : images[0] || '');
  const [selected, setSelected] = useState<string[]>(() =>
    initialImageUrl && images.includes(initialImageUrl)
      ? [initialImageUrl, ...images.filter((src) => src !== initialImageUrl)].slice(0, MAX_VIRTUAL_MODEL_IMAGES)
      : images.slice(0, MAX_VIRTUAL_MODEL_IMAGES),
  );
  const [styleId, setStyleId] = useState(IMAGE_EDIT_STYLES[0].id);
  const [model, setModel] = useState('avery');
  const [scene, setScene] = useState('studio');
  const [pose, setPose] = useState('standing');
  const tokens = Number(workspace?.imageTokens || 0);
  const unlimited = Boolean(workspace?.imageTokensUnlimited);
  const sandbox = Boolean(workspace?.photoroomSandbox);
  const sceneSample = modelSceneSample(scene);
  const modelSample = modelPresetSample(model);
  const styleSample = studioStyleSample(styleId);
  const poseLabel = PHOTOROOM_POSES.find((row) => row.value === pose)?.label || pose;
  const sceneLabel = PHOTOROOM_SCENES.find((row) => row.value === scene)?.label || scene;
  const modelLabel = PHOTOROOM_MODELS.find((row) => row.value === model)?.label || model;
  const productPreview = (mode === 'model' ? selected[0] : imageUrl) || images[0] || '';

  function toggleSelected(src: string) {
    setSelected((current) => {
      if (current.includes(src)) return current.filter((item) => item !== src);
      if (current.length >= MAX_VIRTUAL_MODEL_IMAGES) {
        toast.error(`حداکثر ${faNumber(MAX_VIRTUAL_MODEL_IMAGES)} تصویر از زوایای مختلف`);
        return current;
      }
      return [...current, src];
    });
  }

  function finishSuccess(data: { images?: string[]; imageLibrary?: unknown; resultUrl?: string }, fallbackMessage: string) {
    const nextImages = Array.isArray(data.images) ? data.images : [];
    toast.success(fallbackMessage);
    if (data.imageLibrary != null) onLibraryChange?.(data.imageLibrary);
    onSuccess?.({
      images: nextImages,
      imageLibrary: data.imageLibrary,
      resultUrl: data.resultUrl,
    });
    router.refresh();
  }

  function runStudio() {
    if (!clothId) {
      toast.error('برای جلوه استودیو ابتدا لباس را ذخیره کنید');
      return;
    }
    const loadingId = toast.loading('در حال ساخت تصویر…');
    const source = imageUrl;
    const style = styleId;
    const id = clothId;
    onClose();
    void (async () => {
      const res = await editProductImage({ clothId: id, imageUrl: source, styleId: style });
      toast.dismiss(loadingId);
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        const data = (res.data || {}) as { images?: string[]; imageLibrary?: unknown; resultUrl?: string };
        finishSuccess(data, res.message || 'تصویر آماده شد');
      } else {
        toast.error(res.message || 'ویرایش انجام نشد');
      }
    })();
  }

  function runModel() {
    if (!selected.length) {
      toast.error('حداقل یک تصویر از لباس انتخاب کنید');
      return;
    }
    const loadingId = toast.loading('در حال ساخت تصویر…');
    const urls = [...selected];
    const id = clothId;
    const modelValue = model;
    const sceneValue = scene;
    const poseValue = pose;
    onClose();
    void (async () => {
      const res = await generateClothOnModel({
        clothId: id,
        imageUrls: urls,
        model: modelValue,
        scene: sceneValue,
        pose: poseValue,
      });
      toast.dismiss(loadingId);
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        const data = (res.data || {}) as { images?: string[]; imageLibrary?: unknown; resultUrl?: string };
        finishSuccess(data, res.message || 'عکس مدل آماده شد');
      } else {
        toast.error(res.message || 'ساخت مدل انجام نشد');
      }
    })();
  }

  return (
    <Modal isOpen onClose={onClose} size="xl" rounded="lg" title="ساخت تصویر محصول">
      <FormCard className="border-0 shadow-none rounded-[inherit]">
        {sandbox ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            حالت آزمایشی Photoroom (sandbox) روشن است — خروجی ممکن است واترمارک داشته باشد. برای کلید واقعی،
            PHOTOROOM_SANDBOX=false بگذارید.
          </p>
        ) : null}

        <Tabs
            value={mode}
            onChange={(next) => setMode(next as 'model' | 'studio')}
            tabs={[
              {
                value: 'model',
                label: 'عکس با مدل',
                content: (
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-gray-500">
                      هر ساخت {faNumber(IMAGE_EDIT_TOKEN_COST)} توکن است.
                      {unlimited ? ' حساب ادمین محدودیتی ندارد.' : ` مانده: ${faNumber(tokens)} توکن.`}
                      {' '}چند زاویه لباس را انتخاب کنید؛ تنظیمات را عوض کنید تا نمونهٔ نتیجه را ببینید.
                    </p>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-xs font-medium text-gray-600">انتخاب تصاویر لباس</p>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {images.map((src) => {
                              const active = selected.includes(src);
                              return (
                                <button
                                  key={src}
                                  type="button"
                                  onClick={() => toggleSelected(src)}
                                  className={cn(
                                    'overflow-hidden rounded-xl border transition',
                                    active ? 'border-teal-600 ring-2 ring-teal-600/25' : 'border-gray-200',
                                  )}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={src} alt="" className="h-24 w-full object-cover" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <Select
                            label="مدل"
                            value={model}
                            options={[...PHOTOROOM_MODELS]}
                            onChange={(value) => setModel(String(value))}
                            fullWidth
                          />
                          <Select
                            label="صحنه"
                            value={scene}
                            options={[...PHOTOROOM_SCENES]}
                            onChange={(value) => setScene(String(value))}
                            fullWidth
                          />
                          <Select
                            label="ژست"
                            value={pose}
                            options={[...PHOTOROOM_POSES]}
                            onChange={(value) => setPose(String(value))}
                            fullWidth
                          />
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/40">
                        <div className="border-b border-violet-100 px-3 py-2">
                          <p className="text-xs font-semibold text-violet-950">نمونهٔ پیش‌نمایش</p>
                          <p className="text-[11px] text-violet-900/70">
                            با تغییر مدل / صحنه / ژست، نمونه عوض می‌شود
                          </p>
                        </div>
                        <div className="relative aspect-[3/4] bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            key={`${scene}-${model}-${pose}`}
                            src={sceneSample}
                            alt=""
                            className="h-full w-full object-cover transition-opacity duration-300"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-white">
                            <div className="flex items-end justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{modelLabel}</p>
                                <p className="truncate text-[11px] text-white/80">
                                  {sceneLabel} · {poseLabel}
                                </p>
                              </div>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={modelSample}
                                alt=""
                                className="h-12 w-12 rounded-full border-2 border-white object-cover shadow"
                              />
                            </div>
                          </div>
                          {productPreview ? (
                            <div className="absolute left-2 top-2 overflow-hidden rounded-lg border border-white/80 shadow">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={productPreview} alt="" className="h-14 w-14 object-cover" />
                              <p className="bg-black/60 px-1 py-0.5 text-center text-[9px] text-white">لباس شما</p>
                            </div>
                          ) : null}
                        </div>
                        <p className="px-3 py-2 text-[11px] leading-5 text-violet-900/75">
                          این فقط نمونه‌ای از حس صحنه و مدل است؛ خروجی نهایی روی لباس انتخاب‌شده ساخته می‌شود.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href="/accounting/images" className="text-sm text-teal-800 hover:underline">
                        خرید توکن
                      </Link>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                          انصراف
                        </Button>
                        <Button disabled={!selected.length || !clothId} onClick={runModel}>
                          ساخت با مدل · {faNumber(IMAGE_EDIT_TOKEN_COST)} توکن
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                value: 'studio',
                label: 'استودیو / پس‌زمینه',
                content: (
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-gray-500">
                      هر ساخت {faNumber(IMAGE_EDIT_TOKEN_COST)} توکن است.
                      {unlimited ? ' حساب ادمین محدودیتی ندارد.' : ` مانده: ${faNumber(tokens)} توکن.`}
                      {' '}یک تصویر را انتخاب کنید و نوع استودیو را ببینید.
                    </p>

                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-600">تصویر منبع</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {images.map((src) => {
                          const active = imageUrl === src;
                          return (
                            <button
                              key={src}
                              type="button"
                              onClick={() => setImageUrl(src)}
                              className={cn(
                                'overflow-hidden rounded-xl border transition',
                                active ? 'border-teal-600 ring-2 ring-teal-600/25' : 'border-gray-200',
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt="" className="h-24 w-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {IMAGE_EDIT_STYLES.map((item) => {
                        const sample = studioStyleSample(item.id);
                        const active = styleId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setStyleId(item.id as ImageEditStyleId)}
                            className={cn(
                              'overflow-hidden rounded-2xl border text-right transition',
                              active
                                ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20'
                                : 'border-gray-200 bg-white hover:border-gray-300',
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={sample.url} alt="" className="h-28 w-full object-cover" />
                            <div className="space-y-1 p-3">
                              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                              <p className="text-xs leading-5 text-gray-500">{item.blurb}</p>
                              <p className="text-[11px] text-teal-800">{sample.caption}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-teal-100 bg-teal-50/40">
                      <div className="grid gap-0 sm:grid-cols-2">
                        <div className="relative border-b border-teal-100 sm:border-b-0 sm:border-l">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl || productPreview}
                            alt=""
                            className="h-44 w-full object-cover sm:h-52"
                          />
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] text-white">
                            تصویر شما
                          </span>
                        </div>
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            key={styleId}
                            src={styleSample.url}
                            alt=""
                            className="h-44 w-full object-cover transition-opacity duration-300 sm:h-52"
                          />
                          <span className="absolute bottom-2 right-2 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] text-white">
                            نمونه {IMAGE_EDIT_STYLES.find((row) => row.id === styleId)?.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href="/accounting/images" className="text-sm text-teal-800 hover:underline">
                        خرید توکن
                      </Link>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                          انصراف
                        </Button>
                        <Button disabled={!imageUrl || !clothId} onClick={runStudio}>
                          ساخت تصویر · {faNumber(IMAGE_EDIT_TOKEN_COST)} توکن
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
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
  onLibraryChange,
}: {
  clothId?: string;
  images: string[];
  imageUrl?: string;
  label?: string;
  className?: string;
  compact?: boolean;
  onSuccess?: (payload: ImageEditSuccess) => void;
  onLibraryChange?: (library: unknown) => void;
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
          onLibraryChange={onLibraryChange}
        />
      ) : null}
    </>
  );
}

function ProductImageDesk({
  clothId,
  code,
  images,
  imageLibrary,
  onClose,
  onUpdated,
}: {
  clothId: string;
  code?: string;
  images: string[];
  imageLibrary?: unknown;
  onClose: () => void;
  onUpdated: (next: { images: string[]; imageLibrary: ClothImageGroup[] }) => void;
}) {
  const [library, setLibrary] = useState(() => normalizeClothImageLibrary(imageLibrary, images));
  const [previewUrl, setPreviewUrl] = useState('');
  const [generateForUrl, setGenerateForUrl] = useState('');
  const [saving, startSave] = useTransition();
  const originals = useMemo(() => library.map((group) => group.originalUrl), [library]);
  const shownCount = countShownInLibrary(library);
  const aiCount = library.reduce((sum, group) => sum + group.generated.length, 0);

  useEffect(() => {
    setLibrary(normalizeClothImageLibrary(imageLibrary, images));
    setPreviewUrl('');
    setGenerateForUrl('');
  }, [clothId]); // eslint-disable-line react-hooks/exhaustive-deps -- reopen desk for another product only

  function applyLocal(next: ClothImageGroup[]) {
    setLibrary(next);
    onUpdated({ images: shownUrlsFromLibrary(next), imageLibrary: next });
  }

  function persistLibrary(next: ClothImageGroup[]) {
    const previous = library;
    applyLocal(next);
    startSave(async () => {
      const res = await updateClothImageLibrary({ clothId, imageLibrary: next });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        applyLocal(previous);
        toast.error(res.message || 'ذخیره نمایش تصویر انجام نشد');
      }
    });
  }

  function toggleShown(groupId: string, kind: 'original' | 'generated', generatedId?: string) {
    const result = toggleShownInLibrary(library, { groupId, kind, generatedId });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    persistLibrary(result.library);
  }

  function deleteOriginal(groupId: string, url: string) {
    if (library.length <= 1) {
      toast.error('حداقل یک تصویر باید باقی بماند');
      return;
    }
    if (previewUrl === url) setPreviewUrl('');
    if (generateForUrl === url) setGenerateForUrl('');
    persistLibrary(removeGroupFromLibrary(library, groupId));
  }

  function deleteGenerated(groupId: string, generatedId: string, url: string) {
    if (previewUrl === url) setPreviewUrl('');
    if (generateForUrl === url) setGenerateForUrl('');
    persistLibrary(removeGeneratedFromLibrary(library, groupId, generatedId));
  }

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        size="xl"
        rounded="lg"
        title={code ? `تصاویر محصول ${code}` : 'تصاویر محصول'}
      >
        <FormCard className="space-y-4 border-0 shadow-none rounded-[inherit]">
          {saving ? (
            <ApiWait compact title="در حال ذخیره نمایش تصاویر…" hint="انتخاب نمایش در محصول دارد ذخیره می‌شود." />
          ) : null}
          <div>
            <p className="text-sm text-gray-600">
              روی تصویر بزنید تا بزرگ شود. برای هر اصل، جداگانه ساخت AI بزنید؛ نسخهٔ جدید زیر همان ردیف می‌آید.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {faNumber(aiCount)} نسخه AI · {faNumber(shownCount)} / {faNumber(MAX_CLOTH_IMAGES)} نمایش در محصول
            </p>
          </div>

          <div className="space-y-3">
            {library.map((group, index) => (
              <article key={group.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="grid gap-3 p-3 sm:grid-cols-[6.5rem_1fr_auto] sm:items-center">
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(group.originalUrl)}
                    className="relative overflow-hidden rounded-xl border border-gray-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={group.originalUrl} alt="" className="h-24 w-full object-cover" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-gray-900/75 px-1.5 py-0.5 text-[10px] text-white">
                      اصلی {faNumber(index + 1)}
                    </span>
                  </button>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      تصویر اصلی {faNumber(index + 1)}
                      {group.generated.length ? (
                        <span className="mr-2 text-xs font-normal text-violet-700">
                          · {faNumber(group.generated.length)} نسخه AI
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleShown(group.id, 'original')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition',
                          group.originalShown
                            ? 'border-teal-300 bg-teal-50 text-teal-900'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                        )}
                      >
                        {group.originalShown ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {group.originalShown ? 'نمایش در محصول' : 'مخفی از محصول'}
                      </button>
                      <DeletePopover
                        dir="rtl"
                        title="حذف این تصویر؟"
                        description="تصویر اصلی و نسخه‌های AI آن حذف می‌شوند."
                        onDelete={() => deleteOriginal(group.id, group.originalUrl)}
                        labels={{ yes: 'حذف', no: 'انصراف', deleteAriaLabel: 'حذف تصویر اصلی' }}
                        icon={<Trash2 className="size-3.5" />}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-300"
                    onClick={() => setGenerateForUrl(group.originalUrl)}
                  >
                    <Sparkles className="size-3.5" />
                    ساخت با AI
                  </Button>
                </div>

                {group.generated.length ? (
                  <div className="border-t border-violet-100 bg-violet-50/40 px-3 py-3">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-violet-700" />
                      <p className="text-xs font-semibold text-violet-950">
                        این تصاویر با هوش مصنوعی ساخته شده‌اند
                      </p>
                      <span className="text-[11px] text-violet-800/70">
                        ({faNumber(group.generated.length)})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {group.generated.map((gen) => (
                        <div
                          key={gen.id}
                          className={cn(
                            'w-[6.5rem] space-y-2 rounded-xl border bg-white p-1.5 transition',
                            gen.shown ? 'border-violet-300' : 'border-gray-200',
                          )}
                        >
                          <div className="relative">
                            <button
                              type="button"
                              className="relative block w-full overflow-hidden rounded-lg border border-gray-100"
                              onClick={() => setPreviewUrl(gen.url)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={gen.url} alt="" className="h-24 w-full object-cover" />
                              <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                                <Sparkles className="h-2.5 w-2.5" />
                                AI
                              </span>
                              {gen.shown ? (
                                <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-full bg-teal-600 px-1 py-0.5 text-[9px] text-white">
                                  <Check className="h-2.5 w-2.5" />
                                  در محصول
                                </span>
                              ) : null}
                            </button>
                            <div className="absolute right-0.5 top-0.5 rounded-md bg-white/90 shadow-sm">
                              <DeletePopover
                                dir="rtl"
                                title="حذف این تصویر؟"
                                description="این نسخه AI حذف می‌شود و دیگر در محصول دیده نمی‌شود."
                                onDelete={() => deleteGenerated(group.id, gen.id, gen.url)}
                                labels={{ yes: 'حذف', no: 'انصراف', deleteAriaLabel: 'حذف نسخه AI' }}
                                icon={<Trash2 className="size-3.5" />}
                              />
                            </div>
                          </div>
                          <p className="truncate px-0.5 text-[10px] font-medium text-gray-700">
                            {aiStyleLabel(gen.styleId)}
                          </p>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => toggleShown(group.id, 'generated', gen.id)}
                              className={cn(
                                'inline-flex w-full items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] transition',
                                gen.shown
                                  ? 'border-teal-300 bg-teal-50 text-teal-900'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
                              )}
                            >
                              {gen.shown ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              {gen.shown ? 'نمایش' : 'افزودن'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setGenerateForUrl(gen.url)}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-1.5 py-1 text-[10px] text-violet-900 hover:border-violet-300"
                            >
                              <Sparkles className="h-3 w-3" />
                              ساخت AI
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-dashed border-violet-100 bg-violet-50/30 px-3 py-4 text-center text-xs text-violet-900/80">
                    هنوز نسخه AI برای این اصل ساخته نشده — «ساخت با AI» را بزنید.
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              بستن
            </Button>
          </div>
        </FormCard>
      </Modal>

      {previewUrl ? (
        <Modal isOpen onClose={() => setPreviewUrl('')} size="lg" rounded="lg" title="پیش‌نمایش تصویر">
          <div className="overflow-hidden rounded-2xl bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="mx-auto max-h-[70vh] w-full object-contain" />
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setPreviewUrl('')}>
              بستن
            </Button>
          </div>
        </Modal>
      ) : null}

      {generateForUrl ? (
        <ImageEditModal
          clothId={clothId}
          images={originals.includes(generateForUrl) ? originals : [generateForUrl, ...originals]}
          initialImageUrl={generateForUrl}
          onClose={() => setGenerateForUrl('')}
          onSuccess={(payload) => {
            const next = normalizeClothImageLibrary(payload.imageLibrary, payload.images);
            applyLocal(next);
          }}
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
  clothes: { _id: string; code?: string; images?: unknown; imageLibrary?: unknown }[];
  purchases?: { _id: string; packId?: string; tokens?: number; price?: number; timeStamp?: string }[];
  edits?: {
    _id: string;
    clothId?: string;
    resultUrl?: string;
    sourceUrl?: string;
    styleId?: string;
    timeStamp?: string;
  }[];
}) {
  const workspace = useWorkspace();
  const [rows, setRows] = useState(() =>
    clothes.map((row) => ({
      ...row,
      images: parseImageList(row.images),
      imageLibrary: row.imageLibrary,
    })),
  );
  const [deskId, setDeskId] = useState<string | null>(null);
  const tokens = Number(workspace?.imageTokens || 0);
  const unlimited = Boolean(workspace?.imageTokensUnlimited);
  const canBuy = workspace?.storeRole === 'owner' || Boolean(workspace?.isPlatformAdmin);
  const allowImages = Boolean(workspace?.isPlatformAdmin || workspace?.subscription?.allowClothImages);
  const products = rows.filter(
    (row) => row.images.length || normalizeClothImageLibrary(row.imageLibrary, row.images).length,
  );
  const desk = deskId ? rows.find((row) => row._id === deskId) || null : null;

  useEffect(() => {
    setRows(
      clothes.map((row) => ({
        ...row,
        images: parseImageList(row.images),
        imageLibrary: row.imageLibrary,
      })),
    );
  }, [clothes]);

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
                هر ویرایش تصویر یک توکن مصرف می‌کند. چند زاویه لباس را بدهید تا عکس مدل ساخته شود، یا پس‌زمینه سفید و کاتالوگ.
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
              <p className="text-sm text-gray-500">
                با نوار تعداد را انتخاب کنید (۵ تا ۵۰۰). هر توکن {toman(IMAGE_TOKEN_UNIT_PRICE)} است و یک تصویر را ویرایش می‌کند.
              </p>
            </div>
            <TokenPackCards canBuy={canBuy} />
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">محصولات این فروشگاه</h2>
              <p className="text-sm text-gray-500">
                روی محصول بزنید تا اصل‌ها و نسخه‌های AI را ببینید، تصویر جدید بسازید، و انتخاب کنید کدام‌ها در فروشگاه دیده شوند.
              </p>
            </div>
            {products.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((row) => {
                  const library = normalizeClothImageLibrary(row.imageLibrary, row.images);
                  const aiCount = library.reduce((sum, group) => sum + group.generated.length, 0);
                  const cover =
                    row.images[0] ||
                    library.flatMap((group) => group.generated.map((gen) => gen.url))[0] ||
                    library[0]?.originalUrl ||
                    '';
                  return (
                    <button
                      key={row._id}
                      type="button"
                      onClick={() => setDeskId(row._id)}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-right shadow-sm hover:border-gray-300"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cover} alt="" className="h-44 w-full object-cover" />
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">کد {row.code || '—'}</p>
                        <p className="text-xs text-gray-500">
                          {faNumber(row.images.length)} نمایش در محصول
                          {aiCount ? ` · ${faNumber(aiCount)} نسخه AI` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
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
                  <button
                    key={row._id}
                    type="button"
                    onClick={() => row.clothId && setDeskId(row.clothId)}
                    className="overflow-hidden rounded-xl border border-gray-100 text-right hover:border-violet-300"
                    title="باز کردن محصول"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.resultUrl} alt="" className="h-24 w-full object-cover" />
                    <p className="truncate px-2 py-1 text-[11px] text-gray-500">{aiStyleLabel(row.styleId)}</p>
                  </button>
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

          {desk ? (
            <ProductImageDesk
              clothId={desk._id}
              code={desk.code}
              images={desk.images}
              imageLibrary={desk.imageLibrary}
              onClose={() => setDeskId(null)}
              onUpdated={(next) => {
                setRows((current) =>
                  current.map((row) =>
                    row._id === desk._id
                      ? { ...row, images: next.images, imageLibrary: next.imageLibrary }
                      : row,
                  ),
                );
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
