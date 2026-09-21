'use server';

import { completeGatewayPayment, completeMockPayment, getMockPayment } from '@/server/pay';
import { clearShopCheckout } from '@/actions/shop';

async function afterPayment<T extends { ok: boolean; data?: { kind?: string; invoices?: unknown } | null }>(result: T) {
  if (result.ok && result.data?.kind !== 'subscription') {
    await clearShopCheckout();
  }
  return result;
}

export async function finishGatewayPayment(input: { authority?: string; status?: string }) {
  return afterPayment(await completeGatewayPayment(input));
}

export async function finishMockPayment(authority: string, success: boolean) {
  return afterPayment(await completeMockPayment(authority, success));
}

export async function loadMockPayment(authority: string) {
  return getMockPayment(authority);
}
