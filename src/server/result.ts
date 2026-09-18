export type ActionResult<T = unknown> = {
  ok: boolean;
  data: T | null;
  message: string;
  status: number;
};

export function ok<T>(data: T, message = '', status = 200): ActionResult<T> {
  return { ok: true, data, message, status };
}

export function fail(message: string, status = 400): ActionResult<null> {
  return { ok: false, data: null, message, status };
}

export function failAuth(message = 'وارد شوید') {
  return fail(message, 401);
}

export function failDb() {
  return fail('عملیات ناموفق بود', 500);
}
