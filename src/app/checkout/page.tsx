import { ShopFooter, ShopHeader } from '@/components/shop/ShopChrome';
import { CheckoutForm } from '@/components/shop/CheckoutForm';

export default function CheckoutPage() {
  return (
    <div dir="rtl">
      <ShopHeader />
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-semibold">تسویه سفارش عمده</h1>
        <CheckoutForm />
      </div>
      <ShopFooter />
    </div>
  );
}
