'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { dismissWebsiteClothes, publishWebsiteClothes, setWebsiteListing } from '@/actions/website';
import { faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Checkbox, toast } from '@/ui';

type WebsiteSales = { total: number; invoices: number };

export type WebsiteStoreRow = {
  _id: string;
  name: string;
  websiteListing: boolean;
  sales: WebsiteSales;
};

export type WebsiteBrandNode = {
  _id: string;
  name: string;
  websiteListing: boolean;
  sales: WebsiteSales;
  stores: WebsiteStoreRow[];
};

export type WebsiteUserRow = {
  _id: string;
  name: string;
  phone: string;
  websiteListing: boolean;
  sales: WebsiteSales;
  brands: WebsiteBrandNode[];
};

export type WebsiteRequestRow = {
  _id: string;
  code: string;
  typeName: string;
  brands: string;
  stores: string;
  ownerIds: string[];
  brandIds: string[];
  storeIds: string[];
};

function SalesLine({ sales }: { sales: WebsiteSales }) {
  return (
    <p className="text-xs text-gray-500">
      فروش {toman(sales.total)} · {faNumber(sales.invoices)} فاکتور
    </p>
  );
}

export function WebsiteListingBoard({
  users,
  requests,
}: {
  users: WebsiteUserRow[];
  requests: WebsiteRequestRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  const user = users.find((row) => row._id === userId) || null;
  const brand = user?.brands.find((row) => row._id === brandId) || null;
  const store = brand?.stores.find((row) => row._id === storeId) || null;

  const visibleRequests = useMemo(
    () =>
      requests.filter((row) => {
        if (storeId) return row.storeIds.includes(storeId);
        if (brandId) return row.brandIds.includes(brandId);
        if (userId) return row.ownerIds.includes(userId);
        return true;
      }),
    [requests, userId, brandId, storeId],
  );

  function toggleListing(
    kind: 'user' | 'brand' | 'store' | 'user-brands' | 'brand-stores',
    id: string,
    enabled: boolean,
  ) {
    start(async () => {
      const res = await setWebsiteListing(kind, id, enabled);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'ذخیره نشد');
        return;
      }
      toast.success(res.message || 'ذخیره شد');
      router.refresh();
    });
  }

  function toggleCloth(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function publishSelected() {
    if (!selected.length) {
      toast.error('حداقل یک لباس را انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await publishWebsiteClothes(selected);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'منتشر نشد');
        return;
      }
      toast.success(res.message || 'منتشر شد');
      setSelected([]);
      router.refresh();
    });
  }

  function dismissSelected() {
    if (!selected.length) {
      toast.error('حداقل یک لباس را انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await dismissWebsiteClothes(selected);
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'رد نشد');
        return;
      }
      toast.success(res.message || 'رد شد');
      setSelected([]);
      router.refresh();
    });
  }

  const allBrandsOn = Boolean(user?.brands.length && user.brands.every((row) => row.websiteListing));
  const allStoresOn = Boolean(brand?.stores.length && brand.stores.every((row) => row.websiteListing));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {store ? store.name : brand ? brand.name : user ? user.name : 'کاربران'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {store
                ? 'فروش این فروشگاه. اجازه انتشار فقط برای همین فروشگاه است.'
                : brand
                  ? 'فروش این برند و فروشگاه‌هایش. اجازه را برای خود برند یا همه فروشگاه‌هایش بدهید.'
                  : user
                    ? 'فروش این کاربر و برندهایش. اجازه را برای خود کاربر یا همه برندهایش بدهید.'
                    : 'یک کاربر را باز کنید. کاربر ادمین در این فهرست نیست.'}
            </p>
          </div>
          {user ? (
            <div className="flex flex-wrap gap-2">
              {store && brand ? (
                <Button variant="outline" disabled={pending} onClick={() => setStoreId(null)}>
                  فروشگاه‌های {brand.name}
                </Button>
              ) : null}
              {brand ? (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setStoreId(null);
                    setBrandId(null);
                  }}
                >
                  برندهای {user.name}
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setStoreId(null);
                  setBrandId(null);
                  setUserId(null);
                }}
              >
                همه کاربران
              </Button>
            </div>
          ) : null}
        </div>

        {store ? (
          <div className="mt-4 rounded-2xl border border-gray-100 p-4">
            <SalesLine sales={store.sales} />
            <div className="mt-3">
              <Checkbox
                checked={store.websiteListing}
                disabled={pending}
                label="اجازه درخواست انتشار برای این فروشگاه"
                onChange={() => toggleListing('store', store._id, !store.websiteListing)}
              />
            </div>
          </div>
        ) : brand ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-gray-100 p-4">
              <SalesLine sales={brand.sales} />
              <div className="mt-3 space-y-2">
                <Checkbox
                  checked={brand.websiteListing}
                  disabled={pending}
                  label="اجازه درخواست انتشار برای این برند"
                  onChange={() => toggleListing('brand', brand._id, !brand.websiteListing)}
                />
                <Checkbox
                  checked={allStoresOn}
                  disabled={pending || !brand.stores.length}
                  label="اجازه برای همه فروشگاه‌های این برند"
                  onChange={() => toggleListing('brand-stores', brand._id, !allStoresOn)}
                />
              </div>
            </div>
            {brand.stores.length ? (
              <ul className="space-y-2">
                {brand.stores.map((row) => (
                  <li key={row._id}>
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-gray-100 px-4 py-3 text-right hover:bg-gray-50"
                      onClick={() => setStoreId(row._id)}
                    >
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <SalesLine sales={row.sales} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                فروشگاهی برای این برند ثبت نشده است.
              </p>
            )}
          </div>
        ) : user ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{user.phone}</p>
              <SalesLine sales={user.sales} />
              <div className="mt-3 space-y-2">
                <Checkbox
                  checked={user.websiteListing}
                  disabled={pending}
                  label="اجازه درخواست انتشار برای این کاربر و همه برندها و فروشگاه‌هایش"
                  onChange={() => toggleListing('user', user._id, !user.websiteListing)}
                />
                <Checkbox
                  checked={allBrandsOn}
                  disabled={pending || !user.brands.length}
                  label="اجازه برای همه برندهای این کاربر"
                  onChange={() => toggleListing('user-brands', user._id, !allBrandsOn)}
                />
              </div>
            </div>
            {user.brands.length ? (
              <ul className="space-y-2">
                {user.brands.map((row) => (
                  <li key={row._id}>
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-gray-100 px-4 py-3 text-right hover:bg-gray-50"
                      onClick={() => {
                        setStoreId(null);
                        setBrandId(row._id);
                      }}
                    >
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <SalesLine sales={row.sales} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                برندی برای این کاربر ثبت نشده است.
              </p>
            )}
          </div>
        ) : users.length ? (
          <ul className="mt-4 space-y-2">
            {users.map((row) => (
              <li key={row._id}>
                <button
                  type="button"
                  className="w-full rounded-2xl border border-gray-100 px-4 py-3 text-right hover:bg-gray-50"
                  onClick={() => {
                    setStoreId(null);
                    setBrandId(null);
                    setUserId(row._id);
                  }}
                >
                  <p className="font-medium text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-500">{row.phone}</p>
                  <SalesLine sales={row.sales} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            کاربر دیگری با برند ثبت نشده است.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">لباس‌هایی که برای وب‌سایت درخواست شده</h2>
            <p className="mt-1 text-sm text-gray-500">
              {user
                ? 'فقط درخواست‌های همین انتخاب نشان داده می‌شود. با انتخاب لباس، همان لباس در وب‌سایت منتشر می‌شود.'
                : 'برند و فروشگاه هر لباس اینجاست. لباس‌های ادمین به این فهرست نمی‌آیند.'}
            </p>
          </div>
          <p className="text-sm text-gray-500">{faNumber(selected.length)} انتخاب‌شده</p>
        </div>
        {visibleRequests.length ? (
          <ul className="mt-4 divide-y divide-gray-100">
            {visibleRequests.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <Checkbox
                  checked={selected.includes(row._id)}
                  disabled={pending}
                  label={`کد ${row.code || '—'}${row.typeName ? ` · ${row.typeName}` : ''}`}
                  onChange={() => toggleCloth(row._id)}
                />
                <p className="text-xs text-gray-500">
                  {row.brands ? `برند: ${row.brands}` : 'برند مشخص نیست'}
                  {' · '}
                  {row.stores ? `فروشگاه: ${row.stores}` : 'فروشگاه مشخص نیست'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
            درخواستی برای انتشار نیست.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending || !selected.length} onClick={publishSelected}>
            انتشار در وب‌سایت
          </Button>
          <Button variant="outline" disabled={pending || !selected.length} onClick={dismissSelected}>
            رد درخواست
          </Button>
        </div>
      </section>
    </div>
  );
}
