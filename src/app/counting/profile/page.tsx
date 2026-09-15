import { CountingShell } from '@/components/counting/CountingShell';
import { getSessionUser } from '@/actions/auth';
import { ProfileForm } from '@/components/counting/ProfileForm';
import { errorMessage, guardSession } from '@/lib/auth-guard';

export default async function ProfilePage() {
  const user = await getSessionUser();
  guardSession(user);
  return (
    <CountingShell title="پروفایل" error={errorMessage(user)}>
      <ProfileForm user={user.data as any} />
    </CountingShell>
  );
}
