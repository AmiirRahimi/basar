'use client';

import { createPayment, listPayments } from '@/actions/crud';
import { Button, FormCard, Input, Select } from '@/ui';
import { toman } from '@/lib/format';
import { useState, useTransition } from 'react';

export function AccountClient({ people }: { people: any[] }) {
  const [person, setPerson] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [cash, setCash] = useState(0);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <FormCard>
        <Select
          label="شخص"
          options={people.map((p) => ({ label: p.fullName, value: p._id }))}
          value={person}
          onChange={(v) => {
            const id = String(v);
            setPerson(id);
            start(async () => {
              const res = await listPayments(id);
              setRows(Array.isArray(res.data) ? res.data : []);
            });
          }}
        />
        <div className="mt-4 grid gap-3">
          <Input label="مبلغ نقد" type="number" value={cash} onChange={(e) => setCash(Number(e.target.value))} />
          <Button
            disabled={!person || pending}
            onClick={() =>
              start(async () => {
                const res = await createPayment({ _invoice: person, paymentType: 1, cash });
                setMessage(res.message);
                const list = await listPayments(person);
                setRows(Array.isArray(list.data) ? list.data : []);
              })
            }
          >
            ثبت پرداخت
          </Button>
          {message ? <p className="text-sm">{message}</p> : null}
        </div>
      </FormCard>
      <FormCard>
        <h3 className="mb-3 font-medium">گردش</h3>
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row._id} className="flex justify-between border-b py-2">
              <span>{row.paymentType === 1 ? 'نقد' : 'چک'}</span>
              <span>{toman(row.cash || row.amount)}</span>
            </li>
          ))}
        </ul>
      </FormCard>
    </div>
  );
}
