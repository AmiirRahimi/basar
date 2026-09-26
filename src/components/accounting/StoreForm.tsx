'use client';

import { addStoreBranch } from '@/actions/crud';
import { Button, FormCard, Input, toast } from '@/ui';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function StoreForm() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phonenumbers, setPhonenumbers] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <FormCard>
      <div className="grid gap-3">
        <Input label="نام شعبه" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="تلفن" value={phonenumbers} onChange={(e) => setPhonenumbers(e.target.value)} />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await addStoreBranch({ name, address, phonenumbers, landlines: phonenumbers, city: 0, postalCode: 0 });
              if (redirectIfUnauthorized(res)) return;
              if (res.ok) {
                toast.success(res.message || 'شعبه اضافه شد');
                router.refresh();
              } else {
                toast.error(res.message || 'شعبه اضافه نشد');
              }
            })
          }
        >
          افزودن شعبه
        </Button>
      </div>
    </FormCard>
  );
}
