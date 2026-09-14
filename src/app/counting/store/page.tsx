import { CountingShell } from '@/components/counting/CountingShell';
import { getStore } from '@/actions/crud';
import { StoreForm } from '@/components/counting/StoreForm';

export default async function StorePage() {
  const res = await getStore();
  return (
    <CountingShell title="فروشگاه / شعبه">
      <pre className="mb-4 overflow-auto rounded-xl bg-gray-50 p-4 text-xs">{JSON.stringify(res.data, null, 2)}</pre>
      <StoreForm />
    </CountingShell>
  );
}
