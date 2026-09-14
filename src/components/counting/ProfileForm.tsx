'use client';

import { updateProfile } from '@/actions/auth';
import { Button, FormCard, Input } from '@/ui';
import { useState, useTransition } from 'react';

export function ProfileForm({ user }: { user: any }) {
  const [fullName, setFullName] = useState(user?.fullName || 'کاربر آزمایشی بازار');
  const [address, setAddress] = useState(user?.address || 'تهران، بازار');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();

  return (
    <FormCard>
      <div className="grid max-w-lg gap-3">
        <Input label="نام کامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateProfile({ fullName, address });
              setMessage(res.message || (res.ok ? 'ذخیره شد' : 'خطا'));
            })
          }
        >
          ذخیره
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </FormCard>
  );
}
