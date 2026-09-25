import { RecordDetailPage } from '@/components/counting/RecordDetailPage';
import { notFound } from 'next/navigation';

const DROPDOWNS = new Set(['color', 'size', 'cloth-kind', 'cloth-style']);

export default async function DropdownRecordPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource, id } = await params;
  if (!DROPDOWNS.has(resource)) notFound();
  return <RecordDetailPage resource={resource} id={id} />;
}
