import { DEFAULT_MOQ } from './constants';
import type { CatalogProduct, Cloth } from './types';

const SAMPLE: CatalogProduct[] = [
  {
    id: 'sample-chino',
    code: 'WS-101',
    name: 'شلوار کتان چينو',
    description: 'پارچه کتان فشرده، مناسب فروش عمده فروشگاه‌های پوشاک مردانه. بسته‌های دوازده‌تایی.',
    category: 'شلوار',
    wholesalePrice: 890000,
    minOrderQty: 12,
    count: 240,
    image:
      'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=1200&q=80',
    color: 'خاکی',
    size: 'M-XL',
  },
  {
    id: 'sample-shirt',
    code: 'WS-204',
    name: 'پیراهن آکسفورد',
    description: 'پیراهن یقه دکمه‌ای با بافت آکسفورد. حداقل سفارش یک کارتن دوازده‌تایی در رنگ واحد.',
    category: 'پیراهن',
    wholesalePrice: 720000,
    minOrderQty: 12,
    count: 180,
    image:
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1200&q=80',
    color: 'سفید / آبی',
    size: 'S-XXL',
  },
  {
    id: 'sample-coat',
    code: 'WS-330',
    name: 'کت پشمی پاییزه',
    description: 'کت نیم‌فصل برای بنکداران. قیمت عمده فقط روی سفارش بالای ۸ عدد.',
    category: 'کت',
    wholesalePrice: 2450000,
    minOrderQty: 8,
    count: 64,
    image:
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1200&q=80',
    color: 'زغالی',
    size: 'L-XXL',
  },
  {
    id: 'sample-knit',
    code: 'WS-412',
    name: 'بافت پنبه‌ای یقه اسکی',
    description: 'بافت سبک عمده برای فروش زمستانه. بسته‌بندی کارتنی.',
    category: 'بافت',
    wholesalePrice: 980000,
    minOrderQty: 16,
    count: 128,
    image:
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80',
    color: 'کرم',
    size: 'M-XL',
  },
];

export function sampleCatalog() {
  return SAMPLE;
}

export function clothToProduct(cloth: Cloth): CatalogProduct {
  const typeName = typeof cloth._type === 'object' ? cloth._type?.name : undefined;
  const color = typeof cloth._color === 'object' ? cloth._color?.name : undefined;
  const size = typeof cloth._size === 'object' ? cloth._size?.name : undefined;
  return {
    id: cloth._id,
    code: String(cloth.code ?? cloth._id),
    name: typeName || `لباس ${cloth.code ?? ''}`.trim(),
    description: cloth.description || 'موجودی انبار بازار — فروش فقط به‌صورت عمده.',
    category: typeName || 'پوشاک',
    wholesalePrice: Number(cloth.wholesalePrice || cloth.boughtFee || cloth.tailorFee || 0),
    minOrderQty: Number(cloth.minOrderQty || DEFAULT_MOQ),
    count: Number(cloth.count || 0),
    image: cloth.images?.[0] || SAMPLE[0].image,
    color,
    size,
  };
}
