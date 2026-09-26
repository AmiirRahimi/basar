import { redirect } from 'next/navigation';

export default function SubscriptionPage() {
  redirect('/accounting/profile?tab=subscription');
}
