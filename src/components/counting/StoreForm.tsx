'use client';

import { addStoreBranch } from '@/actions/crud';
import { Button, FormCard, Input } from '@/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function StoreForm() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phonenumbers, setPhonenumbers] = useState('');
  const [message, setMessage] = useState('');
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
              setMessage(res.message);
              if (res.ok) router.refresh();
            })
          }
        >
          افزودن شعبه
        </Button>
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    </FormCard>
  );
}
