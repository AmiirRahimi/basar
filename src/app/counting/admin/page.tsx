import { redirect } from 'next/navigation';

export default function LegacyAdminIndexPage() {
  redirect('/admin');
}
