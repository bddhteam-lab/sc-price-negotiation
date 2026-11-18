import type { ApiAction, ApiResponse } from '../shared/types';

export const DEFAULT_PRODUCTION_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzYZQTczZYzAszhINQWYI8hNLRLyZmSVWxoniMjTNOVLl8KoagS-oRCROT1Ky_OwtIK/exec';

export interface ApiClientAuth {
  idToken?: string;
  devEmail?: string;
}

export function getApiEndpoint(): string {
  const configured = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return DEFAULT_PRODUCTION_APPS_SCRIPT_URL;
  }
  return '/api';
}

/**
 * Calls the SC Price Negotiation backend (`POST` with `text/plain;charset=utf-8`
 * for CORS-safe compatibility with Google Apps Script and Vite `/api` middleware).
 */
export async function callApi<TData = unknown>(
  action: ApiAction,
  payload?: unknown,
  auth?: ApiClientAuth,
): Promise<ApiResponse<TData>> {
  const endpoint = getApiEndpoint();

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        payload,
        ...(auth?.idToken ? { idToken: auth.idToken } : {}),
        ...(auth?.devEmail ? { devEmail: auth.devEmail } : {}),
      }),
    });

    const text = await res.text();
    const parsed = JSON.parse(text) as ApiResponse<TData>;
    return parsed;
  } catch (err: unknown) {
    return {
      ok: false,
      action,
      errorCode: 'INTERNAL_ERROR',
      errorMessage:
        err instanceof Error
          ? `เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ${err.message}`
          : 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ',
    };
  }
}
