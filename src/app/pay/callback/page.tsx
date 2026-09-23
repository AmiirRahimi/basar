import { redirect } from 'next/navigation';
import { finishGatewayPayment } from '@/actions/pay';
import { clearShopCheckout } from '@/actions/shop';

export default async function PayCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ Authority?: string; Status?: string; authority?: string; status?: string }>;
}) {
  const params = await searchParams;
  const authority = params.Authority || params.authority || '';
  const status = params.Status || params.status || '';
  const result = await finishGatewayPayment({ authority, status });
  if (result.ok && result.data?.kind === 'subscription') {
    redirect(result.data.redirectUrl || '/counting/profile?tab=subscription&paid=1');
  }
  if (result.ok && result.data?.kind === 'image-tokens') {
    redirect(result.data.redirectUrl || '/counting/images?paid=1');
  }
  if (result.ok) {
    await clearShopCheckout();
    const invoices = result.data?.invoices || [];
    const ids = invoices.map((invoice) => invoice.id).join(',');
    redirect(`/order/success?paid=1&ids=${encodeURIComponent(ids)}`);
  }
  redirect(`/order/failed?message=${encodeURIComponent(result.message || 'پرداخت ناموفق بود')}`);
}
