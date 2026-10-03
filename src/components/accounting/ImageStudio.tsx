'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { buyImageTokens, editProductImage, generateClothOnModel, previewImageTokenDiscount } from '@/actions/image-ai';
import {
  modelPresetSample,
  modelSceneSample,
  studioStyleSample,
} from '@/lib/ai-image-samples';
import {
  IMAGE_EDIT_STYLES,
  IMAGE_EDIT_TOKEN_COST,
  IMAGE_TOKEN_AMOUNTS,
  IMAGE_TOKEN_UNIT_PRICE,
  imageTokenPrice,
  type ImageEditStyleId,
} from '@/lib/image-tokens';
import { faDate, faNumber, toman } from '@/lib/format';
import { parseImageList } from '@/lib/shop-cart';
import { MAX_VIRTUAL_MODEL_IMAGES, PHOTOROOM_MODELS, PHOTOROOM_POSES, PHOTOROOM_SCENES } from '@/lib/photoroom';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { ApiWait, Button, FormCard, Input, Modal, Select, Tabs, cn, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';
import { PlanLocked } from './PlanLocked';
import { Price, PriceSection } from './Price';

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
  onSuccess?: (images: string[]) => void;
  onLibraryChange?: (library: unknown) => void;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'model' | 'studio'>('model');
  const [imageUrl, setImageUrl] = useState(initialImageUrl && images.includes(initialImageUrl) ? initialImageUrl : images[0] || '');
  const [selected, setSelected] = useState<string[]>(() => images.slice(0, MAX_VIRTUAL_MODEL_IMAGES));
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

  function runStudio() {
    if (!clothId) {
      toast.error('برای جلوه استودیو ابتدا لباس را ذخیره کنید');
      return;
    }
    start(async () => {
      const res = await editProductImage({ clothId, imageUrl, styleId });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        const data = (res.data || {}) as { images?: string[]; imageLibrary?: unknown };
        const nextImages = Array.isArray(data.images) ? data.images : [];
        toast.success(res.message || 'تصویر آماده شد');
        if (data.imageLibrary != null) onLibraryChange?.(data.imageLibrary);
        onSuccess?.(nextImages);
        onClose();
        router.refresh();
      } else {
        toast.error(res.message || 'ویرایش انجام نشد');
      }
    });
  }

  function runModel() {
    if (!selected.length) {
      toast.error('حداقل یک تصویر از لباس انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await generateClothOnModel({
        clothId,
        imageUrls: selected,
        model,
        scene,
        pose,
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        const data = (res.data || {}) as { images?: string[]; imageLibrary?: unknown };
        const nextImages = Array.isArray(data.images) ? data.images : [];
        toast.success(res.message || 'عکس مدل آماده شد');
        if (data.imageLibrary != null) onLibraryChange?.(data.imageLibrary);
        onSuccess?.(nextImages);
        onClose();
        router.refresh();
      } else {
        toast.error(res.message || 'ساخت مدل انجام نشد');
      }
    });
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

        {pending ? (
          <ApiWait title="در حال ساخت تصویر…" hint="این کار کمی طول می‌کشد؛ صفحه را نبندید." />
        ) : (
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
        )}
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
  onSuccess?: (images: string[]) => void;
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
              <p className="text-sm text-gray-500">روی یک عکس بزنید. می‌توانید چند زاویه را انتخاب کنید و با مدل بسازید؛ تصویر جدید جایگزین همان انتخاب‌ها می‌شود.</p>
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
