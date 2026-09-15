import { CountingLogin } from '@/components/counting/CountingLogin';
import { ResultToast } from '@/components/counting/ResultToast';
import { SESSION_EXPIRED_PARAM } from '@/lib/constants';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const expired = Boolean(params[SESSION_EXPIRED_PARAM]);
  return (
    <div className="min-h-screen" dir="rtl">
      {expired ? <ResultToast message="نشست شما منقضی شده است. دوباره وارد شوید." /> : null}
      <CountingLogin />
    </div>
  );
}
