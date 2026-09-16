import { ShopButton } from '@/components/shop/ShopUi';

export default function ShopNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">۴۰۴</p>
      <h1 className="mt-2 text-4xl font-semibold">این مدل در انبار پیدا نشد</h1>
      <p className="mt-3 text-shop-ink/60">ممکن است موجودی تمام شده باشد یا پیوند قدیمی باشد.</p>
      <ShopButton href="/catalog" className="mt-8">
        بازگشت به ایندکس
      </ShopButton>
    </div>
  );
}
