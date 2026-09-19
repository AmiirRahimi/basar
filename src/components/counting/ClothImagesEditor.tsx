'use client';

import { useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { faNumber } from '@/lib/format';
import { encodeImageList, MAX_CLOTH_IMAGES, parseImageList } from '@/lib/shop-cart';
import { Button, IconButton, Input, toast } from '@/ui';

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
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
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
    setEditingIndex(null);
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditDraft(images[index] || '');
  }

  function saveEdit() {
    if (editingIndex == null) return;
    const url = editDraft.trim();
    if (!url) {
      toast.error('آدرس تصویر را وارد کنید');
      return;
    }
    if (images.some((item, index) => index !== editingIndex && item === url)) {
      toast.error('این تصویر قبلاً اضافه شده');
      return;
    }
    emit(images.map((item, index) => (index === editingIndex ? url : item)));
    setEditingIndex(null);
    setEditDraft('');
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs text-gray-500">
            حداکثر {faNumber(MAX_CLOTH_IMAGES)} تصویر. برای هر تصویر دکمه ویرایش هست.
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
              <div className="space-y-2 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[11px] text-gray-500">تصویر {faNumber(index + 1)}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      icon={<Pencil className="h-3 w-3" />}
                      onClick={() => startEdit(index)}
                    >
                      ویرایش
                    </Button>
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
                {editingIndex === index ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      label="آدرس جدید تصویر"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button type="button" size="xs" onClick={saveEdit}>
                        ذخیره تصویر
                      </Button>
                      <Button type="button" size="xs" variant="outline" onClick={() => setEditingIndex(null)}>
                        انصراف
                      </Button>
                    </div>
                  </div>
                ) : null}
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
