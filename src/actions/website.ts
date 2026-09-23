'use server';

import {
  dismissWebsiteClothes as dismiss,
  getWebsiteListingBoard as loadBoard,
  publishWebsiteClothes as publish,
  setWebsiteListing as setListing,
} from '@/server/website-listing';

export async function getWebsiteListingBoard() {
  return loadBoard();
}

export async function setWebsiteListing(
  kind: 'user' | 'brand' | 'store' | 'user-brands' | 'brand-stores',
  id: string,
  enabled: boolean,
) {
  return setListing(kind, id, enabled);
}

export async function publishWebsiteClothes(ids: string[]) {
  return publish(ids);
}

export async function dismissWebsiteClothes(ids: string[]) {
  return dismiss(ids);
}
