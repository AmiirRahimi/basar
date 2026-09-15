'use client';

import { updateProfile } from '@/actions/auth';
import { Button, FormCard, Input, toast } from '@/ui';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { useState, useTransition } from 'react';

export function ProfileForm({ user }: { user: any }) {
  const [fullName, setFullName] = useState(user?.fullName || 'کاربر آزمایشی بازار');
  const [address, setAddress] = useState(user?.address || 'تهران، بازار');
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
              if (redirectIfUnauthorized(res)) return;
              if (res.ok) toast.success(res.message || 'ذخیره شد');
              else toast.error(res.message || 'ذخیره نشد');
            })
          }
        >
          ذخیره
        </Button>
      </div>
    </FormCard>
  );
}
