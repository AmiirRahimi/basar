import { CountingShell } from '@/components/counting/CountingShell';
import { listClothes, listInvoices, listPeople } from '@/actions/crud';
import { WidgetCard } from '@/ui';

export default async function DashboardPage() {
  const [clothes, invoices, people] = await Promise.all([listClothes(), listInvoices(), listPeople()]);
  const clothCount = Array.isArray(clothes.data) ? clothes.data.length : 0;
  const invoiceCount = Array.isArray(invoices.data) ? invoices.data.length : 0;
  const customerCount = Array.isArray(people.data)
    ? people.data.filter((p: any) => String(p.role) === '1').length
    : 0;

  return (
    <CountingShell title="داشبورد" description="خلاصه انبار، فاکتور و مشتریان عمده">
      <div className="grid gap-4 md:grid-cols-3">
        <WidgetCard title="مدل‌های پارچه / لباس">
          <p className="text-3xl font-semibold">{clothCount}</p>
        </WidgetCard>
        <WidgetCard title="فاکتورها">
          <p className="text-3xl font-semibold">{invoiceCount}</p>
        </WidgetCard>
        <WidgetCard title="مشتریان عمده">
          <p className="text-3xl font-semibold">{customerCount}</p>
        </WidgetCard>
      </div>
      {!clothes.ok ? (
        <p className="mt-6 text-sm text-red">{clothes.message || 'اتصال به API بازار برقرار نشد'}</p>
      ) : null}
    </CountingShell>
  );
}
