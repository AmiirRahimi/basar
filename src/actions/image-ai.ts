'use server';

import {
  buyImageTokens as buyTokens,
  editProductImage as editImage,
  generateClothOnModel as generateModel,
  listImageStudio as studio,
  previewImageTokenDiscount as previewTokens,
} from '@/server/image-ai';

export async function listImageStudio() {
  return studio();
}

export async function previewImageTokenDiscount(payload: { tokens: number; discountCode?: string }) {
  return previewTokens(Number(payload.tokens), String(payload.discountCode || ''));
}

export async function buyImageTokens(tokens: number, discountCode = '') {
  return buyTokens(Number(tokens), discountCode);
}

export async function editProductImage(payload: { clothId: string; imageUrl: string; styleId: string }) {
  return editImage(payload);
}

export async function generateClothOnModel(payload: {
  clothId?: string;
  imageUrls: string[];
  model?: string;
  scene?: string;
  pose?: string;
  prompt?: string;
}) {
  return generateModel(payload);
}
