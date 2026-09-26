'use client';

import { faNumber } from '@/lib/format';
import AccordionGallery from './AccordionGallery';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.filter(Boolean);
  if (!list.length) return <div className="h-64 rounded-[2rem] bg-shop-mill/20 sm:h-96 md:h-[32rem]" />;

  const items = list.map((image, index) => ({
    image,
    label: list.length > 1 ? `تصویر ${faNumber(index + 1)}` : name,
    alt: name,
  }));

  return (
    <AccordionGallery
      items={items}
      defaultIndex={0}
      accentColor="#c49440"
      overlayColor="#101c30"
      textColor="#f3efe6"
      expandRatio={items.length <= 2 ? 0.72 : 0.52}
      trigger="hover"
      height={520}
      showLabels
    />
  );
}
