'use client';

import { useRouter } from 'next/navigation';
import { ResourceCrud, type ColumnSpec, type Field } from './ResourceCrud';

export function CrudPage({
  resource,
  title,
  rows,
  columns,
  fields,
  defaults,
  allowWrite = true,
  heading,
  headingDescription,
  headerAction = 'page',
}: {
  resource: string;
  title: string;
  rows: Record<string, any>[];
  columns: ColumnSpec[];
  fields: Field[];
  defaults?: Record<string, string>;
  allowWrite?: boolean;
  heading?: string;
  headingDescription?: string;
  headerAction?: 'page' | 'local';
}) {
  const router = useRouter();
  return (
    <ResourceCrud
      resource={resource}
      title={title}
      rows={rows}
      columns={columns}
      fields={fields}
      defaults={defaults}
      allowWrite={allowWrite}
      heading={heading}
      headingDescription={headingDescription}
      headerAction={headerAction}
      reload={() => router.refresh()}
    />
  );
}
