'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setLineLeftWarehouse } from '@/actions/crud';
import { Checkbox, toast } from '@/ui';
import { faDate, faNumber } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';

export type WarehouseDeskInvoice = {
  id: string;
  invoiceNumber?: number;
  date?: string;
  customer?: string;
  statusLabel: string;
  lines: { id: string; label: string; count: number; packs: string; leftWarehouse: boolean }[];
};

export function WarehouseDesk({ invoices }: { invoices: WarehouseDeskInvoice[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState('');

  function mark(lineId: string, left: boolean) {
    setBusy(lineId);
    start(async () => {
      const res = await setLineLeftWarehouse(lineId, left);
      setBusy('');
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ثبت نشد');
        return;
      }
      toast.success(res.message || 'ثبت شد');
      router.refresh();
    });
  }

  if (!invoices.length) {
    return <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">فاکتور بازی برای خروج از انبار نیست.</p>;
  }

  return (
    <div className="space-y-4">
      {invoices.map((invoice) => (
        <section key={invoice.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900">فاکتور {invoice.invoiceNumber || '—'}</h2>
              <p className="mt-1 text-sm text-gray-500">
                {[invoice.customer, faDate(invoice.date)].filter(Boolean).join(' - ')}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">{invoice.statusLabel}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {invoice.lines.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{line.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {line.packs || `${faNumber(line.count)} عدد`}
                  </p>
                </div>
                <Checkbox
                  checked={line.leftWarehouse}
                  disabled={pending && busy === line.id}
                  onChange={(event) => mark(line.id, event.target.checked)}
                  label="از انبار خارج شد"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
