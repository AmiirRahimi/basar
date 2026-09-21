import { getPublicOrders } from '@/actions/shop';
import { ShopButton } from '@/components/shop/ShopUi';
import { faNumber, toman } from '@/lib/format';

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; paid?: string }>;
}) {
  const { ids = '', paid } = await searchParams;
  const invoices = await getPublicOrders(ids.split(',').map((id) => id.trim()).filter(Boolean));
  const gatewayPaid = paid === '1';

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <p className="text-[11px] tracking-[0.28em] text-shop-saffron">{gatewayPaid ? 'پرداخت شد' : 'ثبت شد'}</p>
      <h1 className="mt-2 text-4xl font-semibold">
        {gatewayPaid ? 'پرداخت انجام شد و سفارش ثبت شد' : 'سفارش عمده ثبت شد'}
      </h1>
      <p className="mt-3 text-shop-ink/65">
        {gatewayPaid
          ? 'سفارش پرداخت‌شده برای فروشنده ارسال شد.'
          : 'سفارش برای حجره ثبت شد. پرداخت و چک را جدا هماهنگ کنید.'}
      </p>
      <div className="mt-8 space-y-6">
        {invoices.length ? (
          invoices.map((invoice) => (
            <article key={invoice.id} className="rounded-[1.6rem] border border-shop-ink/10 bg-shop-paper p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">فاکتور {faNumber(invoice.invoiceNumber)}</h2>
                <p className="text-shop-saffron">{toman(invoice.total)}</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {invoice.lines.map((line, index) => (
                  <li key={`${line.name}-${index}`} className="flex justify-between gap-3 border-b border-shop-ink/5 py-2">
                    <span>
                      {line.name}
                      <span className="mt-1 block text-xs text-shop-ink/50">{line.packsLabel || `${faNumber(line.count)} عدد`}</span>
                    </span>
                    <span>{toman(line.total)}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))
        ) : (
          <p className="text-shop-ink/60">شماره سفارش در دسترس نیست. اگر پرداخت کرده‌اید با فروشنده هماهنگ کنید.</p>
        )}
      </div>
      <div className="mt-8 flex gap-3">
        <ShopButton href="/catalog">ادامه خرید</ShopButton>
        <ShopButton href="/" variant="outline">
          خانه
        </ShopButton>
      </div>
    </div>
  );
}
