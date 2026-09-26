'use server';

import {
  getAdminMarketPrices as loadAdminPrices,
  getPublicMarketPrices as loadPublicPrices,
  refreshCurrencyNow as pullCurrency,
  saveCurrencyPrices as saveCurrencies,
  saveStaticPrices as saveStatics,
} from '@/server/market-prices';

export async function getPublicMarketPrices() {
  return loadPublicPrices();
}

export async function getAdminMarketPrices() {
  return loadAdminPrices();
}

export async function saveCurrencyPrices(input: { currencies?: Array<Record<string, unknown>> }) {
  return saveCurrencies(input);
}

export async function refreshCurrencyNow(input: { id?: string; url?: string; path?: string }) {
  return pullCurrency(input);
}

export async function saveStaticPrices(input: { statics?: Array<Record<string, unknown>> }) {
  return saveStatics(input);
}
