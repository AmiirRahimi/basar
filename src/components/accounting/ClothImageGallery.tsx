'use client';

import { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { faNumber } from '@/lib/format';
import { MAX_CLOTH_IMAGES, parseImageList } from '@/lib/shop-cart';
import { cn } from '@/ui';
import { ClothImageStudio } from './ImageStudio';

export function ClothImageGallery({
  clothId,
  images,
  name,
}: {
  clothId: string;
  images: unknown;
  name?: string;
}) {
  const list = useMemo(() => parseImageList(images), [images]);
  const [active, setActive] = useState(0);
  const current = list[active] || list[0] || '';

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">گالری تصاویر</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          {list.length
            ? `${faNumber(list.length)} از ${faNumber(MAX_CLOTH_IMAGES)} تصویر`
            : `هنوز تصویری ثبت نشده — حداکثر ${faNumber(MAX_CLOTH_IMAGES)} تصویر`}
        </p>
      </div>

      {list.length ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote catalog URLs are not in next/image domains */}
            <img
              src={current}
              alt={name || 'تصویر لباس'}
              className="h-64 w-full object-cover sm:h-96 md:h-[28rem]"
            />
            <ClothImageStudio
              clothId={clothId}
              images={list}
              imageUrl={current}
              label="ساخت با مدل"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-white"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((src, index) => (
              <div key={src + index} className="flex w-20 shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className={cn(
                    'h-20 w-full overflow-hidden rounded-xl border bg-cover bg-center',
                    index === active ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 opacity-80',
                  )}
                  style={{ backgroundImage: `url(${src})` }}
                  aria-label={`تصویر ${index + 1}`}
                />
                <ClothImageStudio
                  clothId={clothId}
                  images={list}
                  imageUrl={src}
                  label="مدل"
                  compact
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-1.5 py-1 text-[11px] font-medium text-gray-700 hover:border-gray-300"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
          <ImageOff className="size-6 text-gray-400" />
          تصویری برای نمایش نیست
        </div>
      )}
    </section>
  );
}
