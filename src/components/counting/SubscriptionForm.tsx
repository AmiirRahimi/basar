'use client';

import { activateSubscription } from '@/actions/auth';
import { Button, FormCard, Input, toast } from '@/ui';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { useState, useTransition } from 'react';

export function SubscriptionForm() {
  const [code, setCode] = useState('');
  const [pending, start] = useTransition();
  return (
    <FormCard>
      <div className="grid max-w-lg gap-3">
        <Input label="کد اشتراک" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await activateSubscription({ code, subscriptionType: 1 });
              if (redirectIfUnauthorized(res)) return;
              if (res.ok) toast.success(res.message || 'فعال شد');
              else toast.error(res.message || 'فعال نشد');
            })
          }
        >
          فعال‌سازی
        </Button>
      </div>
    </FormCard>
  );
}
