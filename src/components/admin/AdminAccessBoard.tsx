'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveAdminPanelGrant } from '@/actions/admin';
import { ADMIN_PERMISSIONS, type AdminPermissionId } from '@/lib/admin-permissions';
import { faNumber } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Checkbox, Input, Select, toast } from '@/ui';

export type AdminAccessAccount = {
  id: string;
  fullName: string;
  phonenumber: string;
};

export type AdminAccessGrant = AdminAccessAccount & {
  permissions: AdminPermissionId[];
};

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف',
  noOptionsFound: 'حسابی پیدا نشد',
};

function toEnDigits(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/\s/g, '');
}

function accountLabel(account: AdminAccessAccount) {
  return [account.fullName, account.phonenumber].filter(Boolean).join(' — ') || account.phonenumber;
}

export function AdminAccessBoard({
  accounts,
  grants,
}: {
  accounts: AdminAccessAccount[];
  grants: AdminAccessGrant[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'account' | 'phone'>('account');
  const [userId, setUserId] = useState('');
  const [phonenumber, setPhonenumber] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  const options = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: accountLabel(account) })),
    [accounts],
  );

  function toggle(id: string) {
    setPermissions((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function edit(grant: AdminAccessGrant) {
    setMode('account');
    setUserId(grant.id);
    setPhonenumber('');
    setPermissions(grant.permissions);
  }

  function reset() {
    setUserId('');
    setPhonenumber('');
    setPermissions([]);
  }

  function removeAccess(id: string) {
    start(async () => {
      const res = await saveAdminPanelGrant({ userId: id, permissions: [] });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'برداشته نشد');
        return;
      }
      toast.success(res.message || 'دسترسی برداشته شد');
      if (userId === id) reset();
      router.refresh();
    });
  }

  function save(nextPermissions = permissions) {
    if (mode === 'account' && !userId) {
      toast.error('یک حساب انتخاب کنید');
      return;
    }
    if (mode === 'phone' && toEnDigits(phonenumber).length < 11) {
      toast.error('شماره موبایل را کامل وارد کنید');
      return;
    }
    if (!nextPermissions.length) {
      toast.error('حداقل یک بخش را انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await saveAdminPanelGrant({
        userId: mode === 'account' ? userId : '',
        phonenumber: mode === 'phone' ? toEnDigits(phonenumber) : '',
        permissions: nextPermissions,
      });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ذخیره نشد');
        return;
      }
      toast.success(res.message || 'ذخیره شد');
      reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">دادن دسترسی</h2>
        <p className="mt-1 text-sm leading-7 text-gray-500">
          این دسترسی فقط ورود به بخش‌های پنل ادمین است و با دسترسی همکارانی که به فروشگاه یا برند اضافه می‌شوند فرق دارد.
          اگر شماره هنوز حساب ندارد، با همین شماره ساخته می‌شود.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant={mode === 'account' ? 'primary' : 'outline'} onClick={() => setMode('account')}>
            از حساب‌های موجود
          </Button>
          <Button type="button" variant={mode === 'phone' ? 'primary' : 'outline'} onClick={() => setMode('phone')}>
            با شماره موبایل
          </Button>
        </div>
        <div className="mt-4 max-w-lg">
          {mode === 'account' ? (
            <Select
              label="حساب"
              value={userId}
              options={options}
              searchable
              placeholder="نام یا موبایل را جستجو کنید"
              labels={selectLabels}
              onChange={(value) => {
                const id = String(value || '');
                setUserId(id);
                const grant = grants.find((item) => item.id === id);
                setPermissions(grant?.permissions || []);
              }}
            />
          ) : (
            <Input
              label="موبایل"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09xxxxxxxxx"
              value={phonenumber}
              onChange={(event) => setPhonenumber(toEnDigits(event.target.value).slice(0, 11))}
            />
          )}
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {ADMIN_PERMISSIONS.map((item) => (
            <Checkbox
              key={item.id}
              checked={permissions.includes(item.id)}
              label={item.label}
              onChange={() => toggle(item.id)}
            />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => save()}>
            {pending ? 'در حال ذخیره...' : 'ذخیره دسترسی'}
          </Button>
          <Button variant="outline" disabled={pending} onClick={reset}>
            پاک کردن فرم
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">کسانی که دسترسی دارند</h2>
        {grants.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {grants.map((grant) => (
              <li key={grant.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-gray-900">{grant.fullName || 'بدون نام'}</p>
                  <p className="text-sm text-gray-500" dir="ltr">
                    {grant.phonenumber}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    {grant.permissions
                      .map((id) => ADMIN_PERMISSIONS.find((item) => item.id === id)?.label || id)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={pending} onClick={() => edit(grant)}>
                    ویرایش
                  </Button>
                  <Button variant="danger" disabled={pending} onClick={() => removeAccess(grant.id)}>
                    برداشتن
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-500">هنوز به کسی دسترسی پنل ادمین داده نشده. {faNumber(accounts.length)} حساب قابل انتخاب است.</p>
        )}
      </section>
    </div>
  );
}
