'use client';

import { addInvoiceLine, createResource, getInvoiceCart, listClothes, listPeople } from '@/actions/crud';
import { Button, FormCard, Input, Select } from '@/ui';
import { displayName, toman } from '@/lib/format';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function InvoiceWorkspace({ invoices }: { invoices: any[] }) {
  const router = useRouter();
  const [people, setPeople] = useState<any[]>([]);
  const [clothes, setClothes] = useState<any[]>([]);
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [selected, setSelected] = useState('');
  const [cloth, setCloth] = useState('');
  const [count, setCount] = useState(1);
  const [price, setPrice] = useState(0);
  const [lines, setLines] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();

  useEffect(() => {
    listPeople().then((r) => setPeople(Array.isArray(r.data) ? r.data : []));
    listClothes().then((r) => setClothes(Array.isArray(r.data) ? r.data : []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    getInvoiceCart(selected).then((r) => setLines(Array.isArray(r.data) ? r.data : []));
  }, [selected]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FormCard>
        <h3 className="mb-4 font-medium">فاکتور جدید</h3>
        <div className="grid gap-3">
          <Select
            label="مشتری"
            options={people
              .filter((p) => String(p.role) === '1')
              .map((p) => ({ label: p.fullName, value: p._id }))}
            value={client}
            onChange={(v) => setClient(String(v))}
          />
          <Input label="آدرس گیرنده" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await createResource('invoice', { _client: client, receiverAddress: address, items: [] });
                setMessage(res.message || (res.ok ? 'فاکتور ساخته شد' : 'خطا'));
                if (res.ok) router.refresh();
              })
            }
          >
            ایجاد فاکتور
          </Button>
        </div>
      </FormCard>
      <FormCard>
        <h3 className="mb-4 font-medium">اقلام فاکتور</h3>
        <Select
          label="فاکتور"
          options={invoices.map((inv) => ({
            label: `#${inv.invoiceNumber || inv._id} — ${displayName(inv._client)}`,
            value: inv._id,
          }))}
          value={selected}
          onChange={(v) => setSelected(String(v))}
        />
        <div className="mt-3 grid gap-3">
          <Select
            label="لباس"
            options={clothes.map((c) => ({ label: String(c.code), value: c._id }))}
            value={cloth}
            onChange={(v) => setCloth(String(v))}
          />
          <Input label="تعداد" type="number" value={count} onChange={(e) => setCount(Number(e.target.value))} />
          <Input label="فی عمده" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <Button
            disabled={!selected || pending}
            onClick={() =>
              start(async () => {
                const res = await addInvoiceLine({ _invoice: selected, _cloth: cloth, count, price });
                setMessage(res.message || 'ثبت شد');
                const cart = await getInvoiceCart(selected);
                setLines(Array.isArray(cart.data) ? cart.data : []);
              })
            }
          >
            افزودن قلم
          </Button>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.map((line) => (
            <li key={line._id} className="flex justify-between border-b py-2">
              <span>{displayName(line._cloth)}</span>
              <span>
                {line.count} × {toman(line.price)}
              </span>
            </li>
          ))}
        </ul>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </FormCard>
      <div className="lg:col-span-2">
        <h3 className="mb-3 font-medium">فهرست فاکتورها</h3>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-right">شماره</th>
                <th className="p-3 text-right">مشتری</th>
                <th className="p-3 text-right">ارسال</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-t">
                  <td className="p-3">{inv.invoiceNumber || inv._id}</td>
                  <td className="p-3">{displayName(inv._client)}</td>
                  <td className="p-3">{inv.isSent ? 'ارسال شده' : 'پیش‌نویس'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
