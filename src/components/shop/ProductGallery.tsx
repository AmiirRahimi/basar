'use client';

import { faNumber } from '@/lib/format';
import { Modal, cn } from '@/ui';
import { useEffect, useRef, useState } from 'react';
import AccordionGallery from './AccordionGallery';

const DESKTOP_HOVER = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';

function ImageLightbox({
  images,
  name,
  index,
  onClose,
  onIndex,
}: {
  images: string[];
  name: string;
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const count = images.length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && count > 1) onIndex((index + 1) % count);
      if (event.key === 'ArrowRight' && count > 1) onIndex((index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, index, onIndex]);

  return (
    <Modal isOpen onClose={onClose} title={name} size="xl" rounded="xl" customSize={960}>
      <div className="bg-shop-ink">
        <img src={images[index]} alt={name} className="h-[min(62vh,640px)] w-full object-contain" />
      </div>
      {count > 1 ? (
        <div className="flex gap-2 overflow-x-auto p-4">
          {images.map((src, imageIndex) => (
            <button
              key={src + imageIndex}
              type="button"
              onClick={() => onIndex(imageIndex)}
              className={cn(
                'h-16 w-14 shrink-0 overflow-hidden rounded-xl border',
                imageIndex === index ? 'border-shop-saffron' : 'border-transparent opacity-70',
              )}
              aria-label={`تصویر ${faNumber(imageIndex + 1)}`}
              aria-current={imageIndex === index ? 'true' : undefined}
            >
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

function TouchGallery({
  images,
  name,
  onOpen,
}: {
  images: string[];
  name: string;
  onOpen: (index: number) => void;
}) {
  const [active, setActive] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const swiped = useRef(false);
  const count = images.length;

  function step(delta: number) {
    setActive((current) => (current + delta + count) % count);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="block w-full overflow-hidden rounded-[2rem] bg-shop-ink"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen(active);
        }}
        onTouchStart={(event) => setTouchX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchX == null || count < 2) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
          if (Math.abs(delta) > 40) {
            swiped.current = true;
            step(delta > 0 ? -1 : 1);
          }
          setTouchX(null);
        }}
        aria-label={`${name}، تصویر ${faNumber(active + 1)}`}
      >
        <img src={images[active]} alt={name} className="h-72 w-full object-cover sm:h-96 md:h-[32rem]" draggable={false} />
      </button>
      {count > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                'h-16 w-14 shrink-0 overflow-hidden rounded-xl border',
                index === active ? 'border-shop-saffron' : 'border-transparent opacity-70',
              )}
              aria-label={`تصویر ${faNumber(index + 1)}`}
              aria-current={index === active ? 'true' : undefined}
            >
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.filter(Boolean);
  const [desktop, setDesktop] = useState<boolean | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_HOVER);
    const apply = () => setDesktop(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  if (!list.length) return <div className="h-64 rounded-[2rem] bg-shop-mill/20 sm:h-96 md:h-[32rem]" />;

  const items = list.map((image, index) => ({
    image,
    label: list.length > 1 ? `تصویر ${faNumber(index + 1)}` : name,
    alt: name,
  }));

  return (
    <>
      {desktop == null ? <div className="h-72 rounded-[2rem] bg-shop-mill/20 sm:h-96 md:h-[32rem]" /> : null}
      {desktop === false ? <TouchGallery images={list} name={name} onOpen={setOpenIndex} /> : null}
      {desktop ? (
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
          onOpen={setOpenIndex}
        />
      ) : null}
      {openIndex != null ? (
        <ImageLightbox images={list} name={name} index={openIndex} onClose={() => setOpenIndex(null)} onIndex={setOpenIndex} />
      ) : null}
    </>
  );
}
