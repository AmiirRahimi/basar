'use server';

import {
  buyImageTokens as buyTokens,
  editProductImage as editImage,
  listImageStudio as studio,
  previewImageTokenDiscount as previewTokens,
} from '@/server/image-ai';

export async function listImageStudio() {
  return studio();
}

export async function previewImageTokenDiscount(payload: { packId: string; discountCode?: string }) {
  return previewTokens(payload.packId, String(payload.discountCode || ''));
}

export async function buyImageTokens(packId: string, discountCode = '') {
  return buyTokens(packId, discountCode);
}

export async function editProductImage(payload: { clothId: string; imageUrl: string; styleId: string }) {
  return editImage(payload);
}
