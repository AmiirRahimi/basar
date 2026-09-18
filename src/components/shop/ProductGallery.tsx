'use client';

import { useState } from 'react';
import { cn } from '@/ui/lib/cn';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.length ? images : [];
  const [active, setActive] = useState(0);
  if (!list.length) return <div className="h-64 rounded-[2rem] bg-shop-mill/20 sm:h-96 md:h-[32rem]" />;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[2rem] bg-shop-ink">
        <div
          className="h-64 bg-cover bg-center sm:h-96 md:h-[32rem] lg:h-[560px]"
          style={{ backgroundImage: `url(${list[active] || list[0]})` }}
          role="img"
          aria-label={name}
        />
      </div>
      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {list.map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                'h-16 w-14 shrink-0 rounded-xl bg-cover bg-center border',
                index === active ? 'border-shop-saffron' : 'border-transparent opacity-70',
              )}
              style={{ backgroundImage: `url(${src})` }}
              aria-label={`تصویر ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
