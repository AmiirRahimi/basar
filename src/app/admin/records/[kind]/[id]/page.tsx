import { notFound } from 'next/navigation';
import { getAdminOverview } from '@/actions/admin';
import { CountingShell } from '@/components/counting/CountingShell';
import { RecordDetail, RecordMissing } from '@/components/counting/RecordDetail';
import { errorMessage, guardSession } from '@/lib/auth-guard';
import { RECORD_LIST_TITLE, RECORD_TYPE_LABEL } from '@/lib/record-view';

const KIND_TO_RESOURCE = {
  users: 'admin-user',
  purchases: 'admin-purchase',
  codes: 'admin-code',
} as const;

export default async function AdminRecordPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  const resource = KIND_TO_RESOURCE[kind as keyof typeof KIND_TO_RESOURCE];
  if (!resource) notFound();

  const overview = await getAdminOverview();
  guardSession(overview);
  const data = overview.data as
    | { users?: Record<string, any>[]; purchases?: Record<string, any>[]; codes?: Record<string, any>[] }
    | null;
  const list =
    resource === 'admin-user' ? data?.users : resource === 'admin-purchase' ? data?.purchases : data?.codes;
  const row = Array.isArray(list) ? list.find((item) => String(item._id) === id) : null;

  return (
    <CountingShell
      title={RECORD_TYPE_LABEL[resource] || 'جزئیات'}
      description={RECORD_LIST_TITLE[resource]}
      error={errorMessage(overview)}
    >
      {row ? <RecordDetail resource={resource} row={row} /> : <RecordMissing resource={resource} />}
    </CountingShell>
  );
}
