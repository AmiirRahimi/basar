'use server';

import { buyImageTokens as buyTokens, editProductImage as editImage, listImageStudio as studio } from '@/server/image-ai';

export async function listImageStudio() {
  return studio();
}

export async function buyImageTokens(packId: string) {
  return buyTokens(packId);
}

export async function editProductImage(payload: { clothId: string; imageUrl: string; styleId: string }) {
  return editImage(payload);
}
