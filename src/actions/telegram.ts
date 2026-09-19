'use server';

import {
  getTelegramPublishBoard as board,
  invitePeopleToTelegramChannel as invitePeople,
  publishClothesToTelegram as publishClothes,
} from '@/server/telegram-publish';

export async function getTelegramPublishBoard() {
  return board();
}

export async function publishClothesToTelegram(payload: { clothIds: string[] }) {
  return publishClothes(payload);
}

export async function invitePeopleToTelegramChannel(payload: { personIds: string[] }) {
  return invitePeople(payload);
}
