'use server';

import { getSmsBoard as board, sendAdminSms as send } from '@/server/sms-admin';

export async function getSmsBoard() {
  return board();
}

export async function sendAdminSms(payload: {
  templateId?: string;
  body?: string;
  audience?: string;
  personIds?: string[];
  userIds?: string[];
  extraPhones?: string;
  link?: string;
  discountPercent?: number;
}) {
  return send(payload);
}
