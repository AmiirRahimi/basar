import { CountingShell } from '@/components/counting/CountingShell';
import { listFabric } from '@/actions/crud';
import { personOptions } from '@/actions/options';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function FabricPage() {
  const [res, mercers, tailors] = await Promise.all([
    listFabric(),
    personOptions('3'),
    personOptions('2'),
  ]);
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="خرید پارچه">
      <CrudPage
        resource="fabric"
        title="پارچه"
        rows={rows}
        columns={[
          { header: 'بنکدار', accessor: '_mercer', format: 'name' },
          { header: 'خیاط', accessor: '_tailor', format: 'name' },
          { header: 'متراژ', accessor: 'amount' },
          { header: 'فی', accessor: 'priceForUnit', format: 'toman' },
        ]}
        fields={[
          { name: '_mercer', label: 'بنکدار', type: 'relation', options: mercers, required: true },
          { name: '_tailor', label: 'خیاط', type: 'relation', options: tailors, required: true },
          { name: 'amount', label: 'متراژ', type: 'number', required: true },
          { name: 'priceForUnit', label: 'فی', type: 'number', required: true },
          { name: 'priceForShipingForUnit', label: 'حمل', type: 'number', required: true },
        ]}
      />
    </CountingShell>
  );
}
