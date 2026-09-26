'use server';

import {
  getAdminMarketPrices as loadAdminPrices,
  getPublicMarketPrices as loadPublicPrices,
  refreshDollarPrice as pullDollar,
  saveDollarPriceSettings as saveDollar,
  saveFabricPrice as saveFabric,
} from '@/server/market-prices';

export async function getPublicMarketPrices() {
  return loadPublicPrices();
}

export async function getAdminMarketPrices() {
  return loadAdminPrices();
}

export async function saveDollarPriceSettings(input: {
  url?: string;
  path?: string;
  interval?: string;
  unit?: string;
}) {
  return saveDollar(input);
}

export async function refreshDollarPrice(input: {
  url?: string;
  path?: string;
  interval?: string;
  unit?: string;
}) {
  return pullDollar(input);
}

export async function saveFabricPrice(input: { value?: number | string; unit?: string; label?: string }) {
  return saveFabric(input);
}
