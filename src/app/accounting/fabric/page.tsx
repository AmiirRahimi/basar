import { AccountingShell } from '@/components/accounting/AccountingShell';
import { listFabric } from '@/actions/crud';
import { personOptions } from '@/actions/options';
import { CrudPage } from '@/components/accounting/CrudPage';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { fabricLotTotal } from '@/lib/cloth-price';

export default async function FabricPage() {
  const [res, mercers, tailors] = await Promise.all([
    listFabric(),
    personOptions('3'),
    personOptions('2'),
  ]);
  guardSession(res);
  const rows = (Array.isArray(res.data) ? res.data : []).map((row: Record<string, any>) => ({
    ...row,
    totalPrice: fabricLotTotal(row),
  }));
  return (
    <AccountingShell title="خرید پارچه" error={errorMessage(res)}>
      <CrudPage
        resource="fabric"
        title="پارچه"
        rows={rows}
        columns={[
          { header: 'بنکدار', accessor: '_mercer', format: 'name' },
          { header: 'خیاط گیرنده', accessor: '_tailor', format: 'name' },
          { header: 'متراژ', accessor: 'amount' },
          { header: 'فی', accessor: 'priceForUnit', format: 'toman' },
          { header: 'حمل', accessor: 'priceForShipingForUnit', format: 'toman' },
          { header: 'مبلغ کل', accessor: 'totalPrice', format: 'toman' },
          { header: 'تخفیف', accessor: 'discount', format: 'toman' },
        ]}
        fields={[
          { name: '_mercer', label: 'بنکدار', type: 'relation', options: mercers, required: true },
          {
            name: '_tailor',
            label: 'این پارچه را به کدام خیاط بفرستید؟',
            type: 'relation',
            options: tailors,
            required: true,
          },
          {
            name: 'amount',
            label: 'متراژ',
            type: 'number',
            required: true,
            group: 'متراژ و قیمت',
            row: true,
          },
          {
            name: 'priceForUnit',
            label: 'فی هر متر',
            type: 'price',
            required: true,
            group: 'متراژ و قیمت',
            row: true,
          },
          {
            name: 'priceForShipingForUnit',
            label: 'حمل هر متر',
            type: 'price',
            required: true,
            group: 'متراژ و قیمت',
            row: true,
          },
          { name: 'discount', label: 'تخفیف', type: 'price' },
          { name: 'extras', label: 'خرج‌های اضافه', type: 'extras', extrasVariant: 'fabric' },
        ]}
      />
    </AccountingShell>
  );
}
