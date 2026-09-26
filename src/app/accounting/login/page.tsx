import { Suspense } from 'react';
import { AccountingLogin } from '@/components/accounting/AccountingLogin';

export default function LoginPage() {
  return (
    <div className="min-h-screen" dir="rtl">
      <Suspense>
        <AccountingLogin />
      </Suspense>
    </div>
  );
}
