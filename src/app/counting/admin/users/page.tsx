import { CountingShell } from '@/components/counting/CountingShell';
import { listUsers } from '@/actions/crud';
import { displayName } from '@/lib/format';

export default async function UsersPage() {
  const res = await listUsers();
  const rows = Array.isArray(res.data) ? res.data : [];
  return (
    <CountingShell title="کاربران" description={res.ok ? undefined : res.message}>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">نام</th>
              <th className="p-3 text-right">موبایل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u: any) => (
              <tr key={u._id} className="border-t">
                <td className="p-3">{displayName(u)}</td>
                <td className="p-3">{u.phonenumber || u.phoneNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CountingShell>
  );
}
