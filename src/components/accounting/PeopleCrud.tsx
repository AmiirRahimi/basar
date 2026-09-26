'use client';

import { useMemo, useState } from 'react';
import { CrudPage } from './CrudPage';
import { PersonRoleFilter } from './PersonRolePicker';
import { PERSON_ROLES, normalizePersonRoles, personHasRole } from '@/lib/constants';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import type { Field } from './ResourceCrud';

const COLUMNS = [
  { header: 'نام', accessor: 'fullName' },
  { header: 'موبایل', accessor: 'phoneNumber' },
  { header: 'نقش', accessor: 'role', format: 'role' as const },
  { header: 'شهر', accessor: 'city' },
  { header: 'آدرس', accessor: 'address' },
];

const FIELDS: Field[] = [
  { name: 'fullName', label: 'نام', required: true },
  { name: 'phoneNumber', label: 'موبایل' },
  { name: 'role', label: 'نقش', type: 'person-role', required: true },
  {
    name: 'sewingFee',
    label: 'اجرت دوخت',
    type: 'price',
    visibleWhen: { field: 'role', values: ['2'] },
  },
  { name: 'address', label: 'آدرس' },
  {
    name: 'city',
    label: 'شهر',
    type: 'select',
    searchable: true,
    options: IRAN_CITY_OPTIONS,
  },
];

export function PeopleCrud({ rows }: { rows: Record<string, any>[] }) {
  const [roleFilter, setRoleFilter] = useState('');

  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const key of Object.keys(PERSON_ROLES)) next[key] = 0;
    for (const row of rows) {
      for (const role of normalizePersonRoles(row.role)) {
        if (role in next) next[role] += 1;
      }
    }
    return next;
  }, [rows]);

  const filtered = useMemo(
    () => (roleFilter ? rows.filter((row) => personHasRole(row.role, roleFilter)) : rows),
    [rows, roleFilter],
  );

  return (
    <div className="space-y-4">
      <PersonRoleFilter value={roleFilter} onChange={setRoleFilter} counts={counts} />
      <CrudPage
        resource="person"
        title="شخص"
        rows={filtered}
        columns={COLUMNS}
        fields={FIELDS}
        defaults={{ role: '1' }}
      />
    </div>
  );
}
