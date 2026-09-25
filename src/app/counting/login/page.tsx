import { Suspense } from 'react';
import { CountingLogin } from '@/components/counting/CountingLogin';

export default function LoginPage() {
  return (
    <div className="min-h-screen" dir="rtl">
      <Suspense>
        <CountingLogin />
      </Suspense>
    </div>
  );
}
