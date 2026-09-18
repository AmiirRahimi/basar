import { RecordDetailPage } from '@/components/counting/RecordDetailPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordDetailPage resource="cloth" id={id} />;
}
