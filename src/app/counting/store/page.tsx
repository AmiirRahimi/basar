import { redirect } from 'next/navigation';

export default function StorePage() {
  redirect('/counting/profile?tab=workspace');
}
