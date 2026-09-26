import { AccountingShell } from '@/components/accounting/AccountingShell';
import { ImageStudioBoard } from '@/components/accounting/ImageStudio';
import { listClothes } from '@/actions/crud';
import { listImageStudio } from '@/actions/image-ai';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function ProductImagesPage() {
  const [clothesRes, studioRes] = await Promise.all([listClothes(), listImageStudio()]);
  guardSession(clothesRes, studioRes);
  const clothes = Array.isArray(clothesRes.data) ? clothesRes.data : [];
  const studio = (studioRes.ok && studioRes.data ? studioRes.data : {}) as {
    purchases?: { _id: string; packId?: string; tokens?: number; price?: number; timeStamp?: string }[];
    edits?: { _id: string; resultUrl?: string; sourceUrl?: string; styleId?: string; timeStamp?: string }[];
  };

  return (
    <AccountingShell
      title="تصویر محصول"
      description="با توکن، پس‌زمینه را سفید کنید یا عکس کاتالوگ استودیویی بسازید. هر ویرایش یک توکن است."
      error={errorMessage(clothesRes) || errorMessage(studioRes)}
    >
      <ImageStudioBoard clothes={clothes} purchases={studio.purchases} edits={studio.edits} />
    </AccountingShell>
  );
}
