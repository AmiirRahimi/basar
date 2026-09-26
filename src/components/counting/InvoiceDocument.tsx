'use client';

import type { CartLine, Invoice } from '@/lib/types';
import { InvoiceBijakView } from './InvoiceBijakView';
import { InvoicePrintView } from './InvoicePrintView';

export function InvoiceDocument({
  kind,
  invoice,
  lines = [],
  backHref,
  backLabel,
  bijakHref,
  invoiceHref,
}: {
  kind: 'print' | 'bijak';
  invoice: Invoice;
  lines?: CartLine[];
  backHref?: string;
  backLabel?: string;
  bijakHref?: string;
  invoiceHref?: string;
}) {
  if (kind === 'bijak') {
    return <InvoiceBijakView invoice={invoice} backHref={backHref} invoiceHref={invoiceHref} />;
  }
  return (
    <InvoicePrintView
      invoice={invoice}
      lines={lines}
      backHref={backHref}
      backLabel={backLabel}
      bijakHref={bijakHref}
    />
  );
}
