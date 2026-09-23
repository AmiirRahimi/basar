/** Related phrases that should surface a sidebar page. */
export const MENU_KEYWORDS: Record<string, string[]> = {
  dashboard: ['داشبورد', 'خانه', 'خلاصه', 'نمای کلی'],
  invoice: ['فاکتور', 'فروش', 'فروش عمده', 'ثبت فاکتور', 'صدور فاکتور'],
  person: ['اشخاص', 'مشتری', 'مشتری عمده', 'طرف حساب', 'ثبت شخص'],
  cloth: ['البسه', 'لباس', 'ثبت لباس', 'پوشاک', 'جنس', 'محصول'],
  share: ['لینک محصول', 'اشتراک', 'لینک', 'کاتالوگ', 'ویترین'],
  images: ['تصویر محصول', 'عکس', 'تصویر', 'ویرایش تصویر'],
  check: ['چک', 'چک دریافتی', 'اسناد'],
  fabric: ['خرید پارچه', 'پارچه', 'بنکدار'],
  account: ['حساب', 'مانده', 'پرداخت', 'دریافت', 'تسویه'],
  returned: ['برگشتی', 'مرجوعی', 'برگشت کالا'],
  profile: ['تنظیمات', 'پروفایل', 'حساب کاربری', 'فروشگاه', 'برند'],
  messages: ['پیام', 'پیام‌ها', 'چت', 'پشتیبانی', 'گفتگو'],
  users: ['کاربران', 'اشتراک', 'کاربر'],
  plans: ['طرح', 'طرح اشتراک', 'پلن', 'قیمت'],
  storefront: ['سفارش ویترین', 'سفارش', 'ویترین'],
  sms: ['پیامک', 'اس‌ام‌اس', 'sms'],
  telegram: ['تلگرام', 'کانال'],
  dropdowns: ['لیست کمکی', 'رنگ', 'سایز', 'نوع لباس'],
};

export type MenuSearchHit = {
  href: string;
  label: string;
  score: number;
};

export type RecentMenuSearch = {
  query: string;
  href: string;
  label: string;
  at: string;
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[آأإ]/g, 'ا')
    .replace(/\s+/g, ' ');
}

export function searchMenuItems(
  query: string,
  items: { href: string; label: string; keywords?: string[] }[],
): MenuSearchHit[] {
  const q = normalize(query);
  if (q.length < 1) return [];

  const hits: MenuSearchHit[] = [];
  for (const item of items) {
    const label = normalize(item.label);
    const keywords = (item.keywords || []).map(normalize).filter(Boolean);
    let score = 0;

    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 86;
    else if (label.includes(q)) score = 78;

    for (const keyword of keywords) {
      if (keyword === q) score = Math.max(score, 94);
      else if (keyword.startsWith(q)) score = Math.max(score, 82);
      else if (keyword.includes(q)) score = Math.max(score, 70);
      else if (q.length >= 2 && q.includes(keyword) && keyword.length >= 2) score = Math.max(score, 64);
    }

    if (score > 0) hits.push({ href: item.href, label: item.label, score });
  }

  hits.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'fa'));
  const seen = new Set<string>();
  return hits.filter((hit) => {
    if (seen.has(hit.href)) return false;
    seen.add(hit.href);
    return true;
  });
}
