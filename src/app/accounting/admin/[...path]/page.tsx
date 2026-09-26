import { redirect } from 'next/navigation';

export default async function LegacyAdminRedirect({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  redirect(path?.length ? `/admin/${path.join('/')}` : '/admin');
}
