export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <p className="text-[11px] tracking-[0.28em] text-shop-ink/40">بنکداری</p>
      <h1 className="mt-2 text-4xl font-semibold">شرایط فروش عمده</h1>
      <p className="mt-4 leading-8 text-shop-ink/70">
        بازار یک بنکداری پوشاک است. سفارش‌ها برای فروشگاه‌ها، مزون‌ها و پخش‌کننده‌هاست، نه خرید تکی مصرف‌کننده.
      </p>
      <ul className="mt-8 space-y-4 text-shop-ink/75">
        <li className="rounded-2xl bg-shop-paper px-5 py-4">هر مدل حداقل سفارش دارد؛ واحد فروش بسته است نه عدد تکی.</li>
        <li className="rounded-2xl bg-shop-paper px-5 py-4">بسته کامل در اولویت است. بسته‌های ناقص جدا انتخاب می‌شوند — همان منطق شمارش.</li>
        <li className="rounded-2xl bg-shop-paper px-5 py-4">فاکتور روی همان موجودی انبار ثبت می‌شود و کارکنان در پنل شمارش آن را می‌بینند.</li>
        <li className="rounded-2xl bg-shop-paper px-5 py-4">پرداخت نقد، چک و اعتبار بعد از هماهنگی در شمارش وارد می‌شود.</li>
      </ul>
    </div>
  );
}
