'use server';

import {
  addReturnedItem,
  addStoreBranch as addBranch,
  clothCounts,
  createPayment as pay,
  createResource as create,
  deleteAttachment,
  deleteResource as remove,
  getResource as getById,
  getStore as storeDb,
  listAttachments,
  listPayments as payments,
  listPublicClothes,
  listResource as listByName,
  listUserPermisions,
  updateResource as update,
} from '@/server/domain';
import { listUsers as usersDb } from '@/server/auth';

export async function listResource<T = any>(resource: string, page = 1, skip = 50, extra = '') {
  return listByName(resource, page, skip, extra) as Promise<{ ok: boolean; data: T | null; message: string; status: number }>;
}

export async function getResource<T = any>(resource: string, id: string) {
  return getById(resource, id) as Promise<{ ok: boolean; data: T | null; message: string; status: number }>;
}

export async function createResource<T = any>(resource: string, payload: unknown) {
  return create(resource, payload) as Promise<{ ok: boolean; data: T | null; message: string; status: number }>;
}

export async function updateResource<T = any>(resource: string, id: string, payload: unknown) {
  return update(resource, id, payload) as Promise<{ ok: boolean; data: T | null; message: string; status: number }>;
}

export async function deleteResource(resource: string, id: string) {
  return remove(resource, id);
}

export async function listClothes(page = 1, skip = 50) {
  return listByName('cloth', page, skip);
}

export async function listPublicCatalog() {
  return listPublicClothes();
}

export async function listPeople(page = 1, skip = 100) {
  return listByName('person', page, skip);
}

export async function listInvoices(page = 1, skip = 50, filter = '{}') {
  return listByName('invoice', page, skip, `filter=${encodeURIComponent(filter)}`);
}

export async function listChecks(page = 1, skip = 50) {
  return listByName('check', page, skip);
}

export async function listFabric(page = 1, skip = 50) {
  return listByName('fabric', page, skip);
}

export async function listReturned(page = 1, skip = 50) {
  return listByName('returned', page, skip);
}

export async function listColors() {
  return listByName('color', 1, 200);
}

export async function listSizes() {
  return listByName('size', 1, 200);
}

export async function listClothKinds() {
  return listByName('cloth-kind', 1, 200);
}

export async function listClothStyles() {
  return listByName('cloth-style', 1, 200);
}

export async function listUsers(page = 1, skip = 50) {
  return usersDb(page, skip);
}

export async function getStore() {
  return storeDb();
}

export async function addStoreBranch(payload: unknown, main = false) {
  return addBranch(payload, main);
}

export async function getInvoiceCart(invoiceId: string) {
  return getById('customer-cart', invoiceId);
}

export async function addInvoiceLine(payload: unknown) {
  return create('customer-cart', payload);
}

export async function updateInvoiceLine(id: string, payload: unknown) {
  return update('customer-cart', id, payload);
}

export async function deleteInvoiceLine(id: string) {
  return remove('customer-cart', id);
}

export async function listPayments(id: string, type = '2', page = 1, skip = 20) {
  return payments(id, type, page, skip);
}

export async function createPayment(info: unknown) {
  return pay(info);
}

export async function listChanges(page = 1, skip = 50) {
  return listByName('change', page, skip);
}

export async function getClothCounts(id: string, type: string) {
  return clothCounts(id, type);
}

export async function addReturnedLine(payload: unknown) {
  return addReturnedItem(payload);
}

export async function getAttachments(id: string) {
  return listAttachments(id);
}

export async function removeAttachment(id: string) {
  return deleteAttachment(id);
}

export async function getPermisions() {
  return listUserPermisions();
}
