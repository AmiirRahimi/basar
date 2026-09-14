'use client';

import { useRouter } from 'next/navigation';
import { ResourceCrud, type Field } from './ResourceCrud';

export function CrudPage({
  resource,
  title,
  rows,
  columns,
  fields,
}: {
  resource: string;
  title: string;
  rows: Record<string, any>[];
  columns: { header: string; accessor: string; cell?: (row: any) => React.ReactNode }[];
  fields: Field[];
}) {
  const router = useRouter();
  return (
    <ResourceCrud
      resource={resource}
      title={title}
      rows={rows}
      columns={columns}
      fields={fields}
      reload={() => router.refresh()}
    />
  );
}
