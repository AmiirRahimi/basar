'use server';

import {
  createBrand as createBrandDb,
  createStore as createStoreDb,
  deleteBrand as deleteBrandDb,
  deleteStore as deleteStoreDb,
  getWorkspace as workspaceDb,
  inviteStoreMember as inviteDb,
  removeStoreMember as removeMemberDb,
  switchWorkspace as switchDb,
  updateBrand as updateBrandDb,
  updateStore as updateStoreDb,
  updateStoreMember as updateMemberDb,
} from '@/server/workspace';

export async function getWorkspace() {
  return workspaceDb();
}

export async function switchWorkspace(payload: { brandId: string; storeId: string }) {
  return switchDb(payload);
}

export async function createBrand(payload: Record<string, unknown>) {
  return createBrandDb(payload);
}

export async function updateBrand(id: string, payload: Record<string, unknown>) {
  return updateBrandDb(id, payload);
}

export async function deleteBrand(id: string) {
  return deleteBrandDb(id);
}

export async function createStore(payload: Record<string, unknown>) {
  return createStoreDb(payload);
}

export async function updateStore(id: string, payload: Record<string, unknown>) {
  return updateStoreDb(id, payload);
}

export async function deleteStore(id: string) {
  return deleteStoreDb(id);
}

export async function inviteStoreMember(payload: Record<string, unknown>) {
  return inviteDb(payload);
}

export async function updateStoreMember(id: string, payload: Record<string, unknown>) {
  return updateMemberDb(id, payload);
}

export async function removeStoreMember(id: string) {
  return removeMemberDb(id);
}
