'use client';

import { useRef, useState, useTransition } from 'react';
import { ImagePlus, Replace, X } from 'lucide-react';
import { uploadClothImages } from '@/actions/image-upload';
import { faNumber } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { encodeImageList, MAX_CLOTH_IMAGES, parseImageList } from '@/lib/shop-cart';
import { Button, FieldGroup, IconButton, toast } from '@/ui';

export function ClothImagesEditor({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  clothId?: string;
  error?: string;
}) {
  const images = parseImageList(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState(false);
  const atLimit = images.length >= MAX_CLOTH_IMAGES;
  const remaining = Math.max(0, MAX_CLOTH_IMAGES - images.length);

  function emit(next: string[]) {
    onChange(encodeImageList(next));
  }

  function remove(src: string) {
    emit(images.filter((item) => item !== src));
  }

  function openPicker(replaceIndex: number | null = null) {
    if (replaceIndex == null && atLimit) {
      toast.error(`حداکثر ${faNumber(MAX_CLOTH_IMAGES)} تصویر برای هر لباس مجاز است`);
      return;
    }
    replaceIndexRef.current = replaceIndex;
    inputRef.current?.click();
  }

  function uploadFiles(fileList: FileList | File[] | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (!files.length) return;

    const replaceIndex = replaceIndexRef.current;
    replaceIndexRef.current = null;
    const slots = replaceIndex == null ? remaining : 1;
    if (!slots) {
      toast.error(`حداکثر ${faNumber(MAX_CLOTH_IMAGES)} تصویر برای هر لباس مجاز است`);
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
      if (replaceIndex != null) {
        emit(images.map((item, index) => (index === replaceIndex ? urls[0] : item)));
      } else {
        emit([...images, ...urls].slice(0, MAX_CLOTH_IMAGES));
      }
      toast.success(res.message || 'تصویر اضافه شد');
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  return (
    <FieldGroup
      title={label}
      description={`فایل تصویر را از دستگاه وارد کنید. حداکثر ${faNumber(MAX_CLOTH_IMAGES)} تصویر (JPG، PNG، WEBP، GIF).`}
      headerAction={
        <p className="shrink-0 text-xs text-gray-500">
          {faNumber(images.length)} / {faNumber(MAX_CLOTH_IMAGES)}
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

      {images.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {images.map((src, index) => (
            <div key={src + index} className="overflow-hidden rounded-xl border border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-900/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-28 w-full object-cover" />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <p className="truncate text-[11px] text-gray-500">تصویر {faNumber(index + 1)}</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    disabled={pending}
                    icon={<Replace className="h-3 w-3" />}
                    onClick={() => openPicker(index)}
                  >
                    جایگزینی
                  </Button>
                  <IconButton
                    type="button"
                    size="xs"
                    variant="ghost"
                    disabled={pending}
                    aria-label="حذف تصویر"
                    onClick={() => remove(src)}
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending || atLimit}
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
          if (atLimit || pending) return;
          replaceIndexRef.current = null;
          uploadFiles(e.dataTransfer.files);
        }}
        className={[
          'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-sm transition-colors',
          atLimit || pending
            ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700'
            : dragging
              ? 'border-primary/50 bg-primary/5 text-primary'
              : 'border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary dark:border-gray-700',
        ].join(' ')}
      >
        <ImagePlus className="h-5 w-5" />
        <span>{pending ? 'در حال بارگذاری…' : atLimit ? 'ظرفیت تصاویر پر است' : 'انتخاب یا رها کردن فایل تصویر'}</span>
        {!atLimit && !pending ? (
          <span className="text-xs text-gray-400">{faNumber(remaining)} جای خالی باقی مانده</span>
        ) : null}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </FieldGroup>
  );
}
