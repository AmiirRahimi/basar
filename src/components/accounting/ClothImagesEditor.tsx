'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Check, ImagePlus, Sparkles, Trash2, Eye, EyeOff } from 'lucide-react';
import { uploadClothImages } from '@/actions/image-upload';
import {
  MAX_AI_VARIANTS_PER_ORIGINAL,
  MAX_CLOTH_ORIGINALS,
  addOriginalToLibrary,
  aiStyleLabel,
  countShownInLibrary,
  encodeClothImageLibrary,
  normalizeClothImageLibrary,
  parseClothImageLibrary,
  removeGroupFromLibrary,
  replaceOriginalInLibrary,
  shownUrlsFromLibrary,
  toggleShownInLibrary,
  type ClothImageGroup,
} from '@/lib/cloth-images';
import { encodeImageList, MAX_CLOTH_IMAGES } from '@/lib/shop-cart';
import { faNumber } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { ApiWait, Button, FieldGroup, IconButton, cn, toast } from '@/ui';
import { ClothImageStudio } from './ImageStudio';

export function ClothImagesEditor({
  label,
  value,
  libraryValue,
  onChange,
  clothId,
  error,
  locked = false,
}: {
  label: string;
  value?: string;
  libraryValue?: string;
  onChange: (images: string, library: string) => void;
  clothId?: string;
  error?: string;
  locked?: boolean;
}) {
  const [library, setLibrary] = useState<ClothImageGroup[]>(() =>
    normalizeClothImageLibrary(parseClothImageLibrary(libraryValue), value),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceGroupIdRef = useRef<string | null>(null);
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [expandedId, setExpandedId] = useState('');

  useEffect(() => {
    const next = normalizeClothImageLibrary(parseClothImageLibrary(libraryValue), value);
    setLibrary(next);
    setExpandedId((current) => {
      if (current && next.some((group) => group.id === current)) return current;
      return next[0]?.id || '';
    });
  }, [libraryValue, value]);

  const shownCount = countShownInLibrary(library);
  const atOriginalLimit = library.length >= MAX_CLOTH_ORIGINALS;
  const remainingOriginals = Math.max(0, MAX_CLOTH_ORIGINALS - library.length);
  const studioSources = useMemo(() => library.map((group) => group.originalUrl), [library]);

  function emit(next: ClothImageGroup[]) {
    setLibrary(next);
    onChange(encodeImageList(shownUrlsFromLibrary(next)), encodeClothImageLibrary(next));
  }

  function openPicker(groupId: string | null = null) {
    if (locked) {
      toast.error('ثبت تصویر لباس فقط در طرح ویترین است');
      return;
    }
    if (groupId == null && atOriginalLimit) {
      toast.error(`حداکثر ${faNumber(MAX_CLOTH_ORIGINALS)} تصویر اصلی مجاز است`);
      return;
    }
    replaceGroupIdRef.current = groupId;
    inputRef.current?.click();
  }

  function toggleShown(groupId: string, kind: 'original' | 'generated', generatedId?: string) {
    const result = toggleShownInLibrary(library, { groupId, kind, generatedId });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    emit(result.library);
  }

  function uploadFiles(fileList: FileList | File[] | null) {
    if (locked) {
      toast.error('ثبت تصویر لباس فقط در طرح ویترین است');
      return;
    }
    const files = fileList ? Array.from(fileList) : [];
    if (!files.length) return;

    const replaceGroupId = replaceGroupIdRef.current;
    replaceGroupIdRef.current = null;
    const slots = replaceGroupId == null ? remainingOriginals : 1;
    if (!slots) {
      toast.error(`حداکثر ${faNumber(MAX_CLOTH_ORIGINALS)} تصویر اصلی مجاز است`);
      return;
    }

    const formData = new FormData();
    formData.set('remaining', String(slots));
    files.slice(0, slots).forEach((file) => formData.append('files', file));

    start(async () => {
      const res = await uploadClothImages(formData);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data?.urls?.length) {
        toast.error(res.message || 'بارگذاری تصویر ناموفق بود');
        return;
      }
      const urls = res.data.urls;
      let next = library;
      if (replaceGroupId) {
        next = replaceOriginalInLibrary(next, replaceGroupId, urls[0]);
      } else {
        for (const url of urls) next = addOriginalToLibrary(next, url);
      }
      emit(next);
      if (next[0]) setExpandedId(replaceGroupId || next[next.length - 1]?.id || next[0].id);
      toast.success(res.message || 'تصویر اضافه شد');
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <FieldGroup
      title={label}
      description={
        locked
          ? 'ثبت تصویر فقط در طرح ویترین است. طرح را از تنظیمات اشتراک ارتقا دهید.'
          : `تصویر اصلی را بارگذاری کنید، چند نسخه هوش مصنوعی بسازید، و انتخاب کنید کدام‌ها در محصول دیده شوند. حداکثر ${faNumber(MAX_CLOTH_IMAGES)} تصویر نمایشی.`
      }
      headerAction={
        <p className="shrink-0 text-xs text-gray-500">
          نمایشی {faNumber(shownCount)} / {faNumber(MAX_CLOTH_IMAGES)}
        </p>
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />

      {pending ? <ApiWait title="در حال بارگذاری تصویر…" hint="فایل دارد روی سرور ذخیره می‌شود." /> : null}

      {!pending && shownCount ? (
        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-teal-900">پیش‌نمایش تصاویر محصول</p>
            <p className="text-[11px] text-teal-800/70">{faNumber(shownCount)} تصویر نمایشی</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {shownUrlsFromLibrary(library).map((url) => {
              const isAi = library.some((group) => group.generated.some((gen) => gen.url === url && gen.shown));
              return (
                <div
                  key={url}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <span
                    className={cn(
                      'absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium text-white',
                      isAi ? 'bg-violet-600' : 'bg-gray-800/80',
                    )}
                  >
                    {isAi ? 'AI' : 'اصلی'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!pending && library.length ? (
        <div className="space-y-3">
          {library.map((group, index) => {
            const expanded = expandedId === group.id;
            const aiCount = group.generated.length;
            return (
              <article
                key={group.id}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-white shadow-sm transition',
                  expanded ? 'border-teal-200 ring-1 ring-teal-100' : 'border-gray-200',
                )}
              >
                <div className="grid gap-3 p-3 sm:grid-cols-[7.5rem_1fr_auto] sm:items-center">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? '' : group.id)}
                    className="relative overflow-hidden rounded-xl border border-gray-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={group.originalUrl} alt="" className="h-28 w-full object-cover sm:h-24" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-gray-900/75 px-1.5 py-0.5 text-[10px] text-white">
                      اصلی
                    </span>
                  </button>

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">تصویر اصلی {faNumber(index + 1)}</p>
                      {aiCount ? (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                          {faNumber(aiCount)} نسخه AI
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500">
                          هنوز نسخه AI ندارد
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-5 text-gray-500">
                      از همین عکس چند نسخه بسازید و تیک بزنید کدام‌ها در فروشگاه دیده شوند.
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={locked}
                        onClick={() => openPicker(group.id)}
                      >
                        جایگزینی اصل
                      </Button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? '' : group.id)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:border-gray-300"
                      >
                        {expanded ? 'بستن نسخه‌ها' : 'دیدن نسخه‌ها'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:flex-col sm:items-end">
                    {!locked && clothId ? (
                      <ClothImageStudio
                        clothId={clothId}
                        images={studioSources}
                        imageUrl={group.originalUrl}
                        label="ساخت AI"
                        compact
                        className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900 hover:border-violet-300"
                        onLibraryChange={(nextLibrary) => emit(normalizeClothImageLibrary(nextLibrary, []))}
                      />
                    ) : null}
                    <IconButton
                      type="button"
                      size="xs"
                      variant="ghost"
                      aria-label="حذف تصویر اصلی"
                      onClick={() => emit(removeGroupFromLibrary(library, group.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                {expanded ? (
                  <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-700">نسخه‌های ساخته‌شده با هوش مصنوعی</p>
                      <p className="text-[11px] text-gray-500">
                        {faNumber(aiCount)} / {faNumber(MAX_AI_VARIANTS_PER_ORIGINAL)}
                      </p>
                    </div>
                    {aiCount ? (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {group.generated.map((gen) => (
                          <div
                            key={gen.id}
                            className={cn(
                              'overflow-hidden rounded-xl border bg-white transition',
                              gen.shown ? 'border-violet-300 ring-1 ring-violet-100' : 'border-gray-200',
                            )}
                          >
                            <div className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={gen.url} alt="" className="h-36 w-full object-cover" />
                              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                                <Sparkles className="h-3 w-3" />
                                AI
                              </span>
                              {gen.shown ? (
                                <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] text-white">
                                  <Check className="h-3 w-3" />
                                  در محصول
                                </span>
                              ) : null}
                            </div>
                            <div className="space-y-2 p-2.5">
                              <p className="text-xs font-medium text-gray-800">{aiStyleLabel(gen.styleId)}</p>
                              <button
                                type="button"
                                onClick={() => toggleShown(group.id, 'generated', gen.id)}
                                className={cn(
                                  'flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition',
                                  gen.shown
                                    ? 'border-teal-300 bg-teal-50 text-teal-900'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                                )}
                              >
                                {gen.shown ? (
                                  <>
                                    <Eye className="h-3.5 w-3.5" />
                                    نمایش در محصول
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" />
                                    افزودن به محصول
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 text-center">
                        <Sparkles className="mx-auto h-5 w-5 text-violet-500" />
                        <p className="mt-2 text-sm text-violet-950">هنوز نسخه‌ای ساخته نشده</p>
                        <p className="mt-1 text-xs text-violet-900/70">
                          با «ساخت AI» چند خروجی مختلف از همین عکس بگیرید و بعد انتخاب کنید کدام‌ها دیده شوند.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {!pending ? (
        <button
          type="button"
          disabled={atOriginalLimit || locked}
          onClick={() => openPicker(null)}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (atOriginalLimit) return;
            replaceGroupIdRef.current = null;
            uploadFiles(e.dataTransfer.files);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-sm transition-colors',
            atOriginalLimit || locked
              ? 'cursor-not-allowed border-gray-200 text-gray-400'
              : dragging
                ? 'border-primary/50 bg-primary/5 text-primary'
                : 'border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary',
          )}
        >
          <ImagePlus className="h-5 w-5" />
          <span>
            {locked
              ? 'برای افزودن تصویر، طرح ویترین را فعال کنید'
              : atOriginalLimit
                ? 'ظرفیت تصاویر اصلی پر است'
                : 'افزودن تصویر اصلی'}
          </span>
          {!locked && !atOriginalLimit ? (
            <span className="text-xs text-gray-400">{faNumber(remainingOriginals)} جای خالی برای تصویر اصلی</span>
          ) : null}
        </button>
      ) : null}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </FieldGroup>
  );
}
