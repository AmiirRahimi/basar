'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { faNumber } from '@/lib/format';
import { encodeImageList, MAX_CLOTH_IMAGES, parseImageList } from '@/lib/shop-cart';
import { Button, IconButton, Input, toast } from '@/ui';
import { ClothImageStudio } from './ImageStudio';

export function ClothImagesEditor({
  label,
  value,
  onChange,
  clothId,
  error,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  clothId?: string;
  error?: string;
}) {
  const images = parseImageList(value);
  const [draft, setDraft] = useState('');
  const atLimit = images.length >= MAX_CLOTH_IMAGES;

  function emit(next: string[]) {
    onChange(encodeImageList(next));
  }

  function add() {
    const url = draft.trim();
    if (!url) {
      toast.error('آدرس تصویر را وارد کنید');
      return;
    }
    if (atLimit) {
      toast.error(`حداکثر ${faNumber(MAX_CLOTH_IMAGES)} تصویر برای هر لباس مجاز است`);
      return;
    }
    if (images.includes(url)) {
      toast.error('این تصویر قبلاً اضافه شده');
      return;
    }
    emit([...images, url]);
    setDraft('');
  }

  function remove(src: string) {
    emit(images.filter((item) => item !== src));
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs text-gray-500">
            حداکثر {faNumber(MAX_CLOTH_IMAGES)} تصویر. هر تصویر دکمه‌ای برای ویرایش دارد.
          </p>
        </div>
        <p className="shrink-0 text-xs text-gray-500">
          {faNumber(images.length)} / {faNumber(MAX_CLOTH_IMAGES)}
        </p>
      </div>

      {images.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {images.map((src, index) => (
            <div key={src + index} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-28 w-full object-cover" />
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <p className="truncate text-[11px] text-gray-500">تصویر {faNumber(index + 1)}</p>
                <div className="flex items-center gap-1">
                  {clothId ? (
                    <ClothImageStudio
                      clothId={clothId}
                      images={images}
                      imageUrl={src}
                      label="ویرایش"
                      onSuccess={(next) => emit(parseImageList(next))}
                      compact
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-gray-300"
                    />
                  ) : (
                    <span className="text-[11px] text-gray-400">پس از ثبت، قابل ویرایش است</span>
                  )}
                  <IconButton
                    type="button"
                    size="xs"
                    variant="ghost"
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
      ) : (
        <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">
          هنوز تصویری اضافه نشده است
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Input
          label="آدرس تصویر"
          value={draft}
          disabled={atLimit}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={atLimit ? 'ظرفیت تصاویر پر است' : 'https://...'}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={atLimit}
          onClick={add}
          icon={<Plus className="h-4 w-4" />}
        >
          افزودن تصویر
        </Button>
      </div>
      {atLimit ? (
        <p className="text-xs text-amber-700">نمی‌توان بیش از {faNumber(MAX_CLOTH_IMAGES)} تصویر اضافه کرد.</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
