import { CartLines } from '@/components/shop/CartLines';

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-6">
      <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">برگه بسته‌بندی</p>
      <h1 className="mt-2 mb-8 text-4xl font-semibold">سبد عمده</h1>
      <CartLines />
    </div>
  );
}
