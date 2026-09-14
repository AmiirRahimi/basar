import { CountingShell } from '@/components/counting/CountingShell';
import { listFabric } from '@/actions/crud';
import { CrudPage } from '@/components/counting/CrudPage';

export default async function FabricPage() {
  const res = await listFabric();
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
          { name: '_mercer', label: 'شناسه بنکدار' },
          { name: '_tailor', label: 'شناسه خیاط' },
          { name: 'amount', label: 'متراژ', type: 'number' },
          { name: 'priceForUnit', label: 'فی', type: 'number' },
          { name: 'priceForShipingForUnit', label: 'حمل', type: 'number' },
        ]}
      />
    </CountingShell>
  );
}
