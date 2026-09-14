import CryptoJS from 'crypto-js';
import { getTelcServicesConfig } from '../config';

function getSecretKey() {
  return getTelcServicesConfig().secretKey || 'defaultSecretKey';
}

export function enc(value: string) {
  return CryptoJS.AES.encrypt(value, getSecretKey()).toString();
}

export function dec(value: string) {
  try {
    const bytes = CryptoJS.AES.decrypt(value, getSecretKey());
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}
