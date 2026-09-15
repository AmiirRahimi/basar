import { CountingShell } from '@/components/counting/CountingShell';
import { getStore } from '@/actions/crud';
import { StoreForm } from '@/components/counting/StoreForm';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function StorePage() {
  const res = await getStore();
  guardSession(res);
  return (
    <CountingShell title="فروشگاه / شعبه" error={errorMessage(res)}>
      <pre className="mb-4 overflow-auto rounded-xl bg-gray-50 p-4 text-xs">{JSON.stringify(res.data, null, 2)}</pre>
      <StoreForm />
    </CountingShell>
  );
}
