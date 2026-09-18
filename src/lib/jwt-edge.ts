function b64urlToBytes(input: string) {
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** HMAC-SHA256 JWT check for Edge middleware. Rejects missing exp, wrong alg, or bad signature. */
export async function jwtHs256Valid(token: string, secret: string) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0]))) as { alg?: string };
    if (header.alg !== 'HS256') return false;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1]))) as { exp?: number; _id?: unknown };
    if (!payload._id) return false;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return false;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(parts[2]) as BufferSource,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    return false;
  }
}
