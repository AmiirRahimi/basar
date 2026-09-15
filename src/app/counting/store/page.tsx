import { CountingShell } from '@/components/counting/CountingShell';
import { BrandStoreWorkspace } from '@/components/counting/BrandStoreWorkspace';
import { getWorkspace } from '@/actions/workspace';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function StorePage() {
  const res = await getWorkspace();
  guardSession(res);
  return (
    <CountingShell
      title="برند و فروشگاه"
      description="برندها، فروشگاه‌های عمده و تیم هر فروشگاه را از اینجا مدیریت کنید."
      error={errorMessage(res)}
    >
      <BrandStoreWorkspace />
    </CountingShell>
  );
}
