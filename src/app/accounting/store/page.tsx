import { redirect } from 'next/navigation';

export default function StorePage() {
  redirect('/accounting/profile?tab=workspace');
}
