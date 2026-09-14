import { CountingShell } from '@/components/counting/CountingShell';
import { getSessionUser } from '@/actions/auth';
import { ProfileForm } from '@/components/counting/ProfileForm';

export default async function ProfilePage() {
  const user = await getSessionUser();
  return (
    <CountingShell title="پروفایل">
      <ProfileForm user={user.data as any} />
    </CountingShell>
  );
}
