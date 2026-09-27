'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClothImageGallery } from './ClothImageGallery';
import { ClothColorPicker } from '@/components/shop/ClothColorPicker';

export type ClothModelColor = {
  id: string;
  name: string;
  hex: string;
  images?: string[];
  count?: number;
};

export function ClothModelGallery({
  clothId,
  images,
  name,
  colors,
}: {
  clothId: string;
  images: unknown;
  name?: string;
  colors: ClothModelColor[];
}) {
  const [selected, setSelected] = useState(clothId);
  const current = colors.find((color) => color.id === selected);
  const shown = current?.images?.length ? current.images : selected === clothId ? images : [];

  return (
    <div className="space-y-3">
      {colors.length > 1 ? (
        <section className="rounded-3xl border border-gray-200/80 bg-white px-4 py-4 shadow-sm sm:px-5">
          <ClothColorPicker
            label="رنگ‌های این مدل"
            colors={colors.map((color) => ({ id: color.id, name: color.name, hex: color.hex }))}
            value={selected}
            onChange={setSelected}
          />
          {selected !== clothId ? (
            <Link href={`/accounting/clothes/${selected}`} className="mt-3 inline-flex text-sm text-teal-800 underline">
              موجودی و عکس این رنگ
            </Link>
          ) : (
            <p className="mt-2 text-xs text-gray-500">با انتخاب رنگ، عکس همان رنگ نشان داده می‌شود.</p>
          )}
        </section>
      ) : null}
      <ClothImageGallery key={selected} clothId={selected === clothId ? clothId : selected} images={shown} name={name} />
    </div>
  );
}
