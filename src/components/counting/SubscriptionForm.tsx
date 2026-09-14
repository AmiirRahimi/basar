'use client';

import { activateSubscription } from '@/actions/auth';
import { Button, FormCard, Input } from '@/ui';
import { useState, useTransition } from 'react';

export function SubscriptionForm() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
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
              setMessage(res.message);
            })
          }
        >
          فعال‌سازی
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </FormCard>
  );
}
