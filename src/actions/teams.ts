'use server';

import {
  addTeamPerson as addTeamPersonDb,
  createTeam as createTeamDb,
  deleteTeam as deleteTeamDb,
  getInviteByToken as getInviteByTokenDb,
  inviteTeamMember as inviteTeamMemberDb,
  removeTeamMember as removeTeamMemberDb,
  respondToTeamInvite as respondToTeamInviteDb,
  sendTeamInviteLink as sendTeamInviteLinkDb,
  updateTeam as updateTeamDb,
  updateTeamMember as updateTeamMemberDb,
} from '@/server/teams';

export async function addTeamPerson(payload: Record<string, unknown>) {
  return addTeamPersonDb(payload);
}

export async function sendTeamInviteLink(id: string) {
  return sendTeamInviteLinkDb(id);
}

export async function getInviteByToken(token: string) {
  return getInviteByTokenDb(token);
}

export async function createTeam(payload: Record<string, unknown>) {
  return createTeamDb(payload);
}

export async function updateTeam(id: string, payload: Record<string, unknown>) {
  return updateTeamDb(id, payload);
}

export async function deleteTeam(id: string) {
  return deleteTeamDb(id);
}

export async function inviteTeamMember(payload: Record<string, unknown>) {
  return inviteTeamMemberDb(payload);
}

export async function updateTeamMember(id: string, payload: Record<string, unknown>) {
  return updateTeamMemberDb(id, payload);
}

export async function removeTeamMember(id: string) {
  return removeTeamMemberDb(id);
}

export async function respondToTeamInvite(id: string, accept: boolean) {
  return respondToTeamInviteDb(id, accept);
}
