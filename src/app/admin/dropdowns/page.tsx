import { CountingShell } from '@/components/counting/CountingShell';
import { listClothKinds, listClothStyles, listColors, listSizes } from '@/actions/crud';
import { clothKindOptions } from '@/actions/options';
import { DropdownsBoard } from '@/components/counting/DropdownsBoard';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function DropdownsPage() {
  const [colors, sizes, kinds, styles, kindOptions] = await Promise.all([
    listColors(),
    listSizes(),
    listClothKinds(),
    listClothStyles(),
    clothKindOptions(),
  ]);
  guardSession(colors, sizes, kinds, styles);
  return (
    <CountingShell
      title="لیست‌های کمکی"
      description="نوع، مدل، رنگ و سایز لباس را از همین‌جا ببینید و اضافه کنید"
      error={errorMessage(kinds)}
    >
      <DropdownsBoard
        kinds={Array.isArray(kinds.data) ? kinds.data : []}
        styles={Array.isArray(styles.data) ? styles.data : []}
        colors={Array.isArray(colors.data) ? colors.data : []}
        sizes={Array.isArray(sizes.data) ? sizes.data : []}
        kindOptions={kindOptions}
      />
    </CountingShell>
  );
}
