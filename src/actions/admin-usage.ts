'use server';

import { getAdminUsageReport as report } from '@/server/admin-usage';

export async function getAdminUsageReport() {
  return report();
}
