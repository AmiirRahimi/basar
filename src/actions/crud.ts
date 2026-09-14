'use server';

import { nestFetch, nestList } from '@/lib/nest';

export async function listResource<T = any>(resource: string, page = 1, skip = 50, extra = '') {
  return nestList<T>(resource, page, skip, extra);
}

export async function getResource<T = any>(resource: string, id: string) {
  return nestFetch<T>(`/${resource}/${id}`);
}

export async function createResource<T = any>(resource: string, payload: unknown) {
  return nestFetch<T>(`/${resource}`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateResource<T = any>(resource: string, id: string, payload: unknown) {
  return nestFetch<T>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteResource(resource: string, id: string) {
  return nestFetch(`/${resource}/${id}`, { method: 'DELETE' });
}

export async function listClothes(page = 1, skip = 50) {
  return listResource('cloth', page, skip);
}

export async function listPeople(page = 1, skip = 100) {
  return listResource('person', page, skip);
}

export async function listInvoices(page = 1, skip = 50, filter = '{}') {
  return listResource('invoice', page, skip, `filter=${encodeURIComponent(filter)}`);
}

export async function listChecks(page = 1, skip = 50) {
  return listResource('check', page, skip);
}

export async function listFabric(page = 1, skip = 50) {
  return listResource('fabric', page, skip);
}

export async function listReturned(page = 1, skip = 50) {
  return listResource('returned', page, skip);
}

export async function listColors() {
  return nestFetch<any[]>('/color');
}

export async function listSizes() {
  return nestFetch<any[]>('/size');
}

export async function listClothKinds() {
  return nestFetch<any[]>('/cloth-kind');
}

export async function listUsers(page = 1, skip = 50) {
  return nestFetch<any[]>(`/user/list?page=${page}&skip=${skip}`);
}

export async function getStore() {
  return nestFetch('/store');
}

export async function addStoreBranch(payload: unknown, main = false) {
  return nestFetch(main ? '/store/branch/main' : '/store/branch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getInvoiceCart(invoiceId: string) {
  return nestFetch<any[]>(`/customer-cart/${invoiceId}`);
}

export async function addInvoiceLine(payload: unknown) {
  return nestFetch('/customer-cart', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateInvoiceLine(id: string, payload: unknown) {
  return nestFetch(`/customer-cart/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteInvoiceLine(id: string) {
  return nestFetch(`/customer-cart/${id}`, { method: 'DELETE' });
}

export async function listPayments(id: string, type = '2', page = 1, skip = 20) {
  return nestFetch(`/payment/${id}?type=${type}&page=${page}&skip=${skip}`);
}

export async function createPayment(info: unknown) {
  return nestFetch('/payment', { method: 'POST', body: JSON.stringify({ info }) });
}

export async function listChanges(page = 1, skip = 50) {
  return listResource('change', page, skip);
}
