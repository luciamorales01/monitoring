import { appEnv } from './env';
import { tokenStorage } from './tokenStorage';

type ApiClientOptions = RequestInit & {
  skipAuth?: boolean;
  timeoutMs?: number;
};

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${appEnv.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildHeaders(options: ApiClientOptions) {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth) {
    const token = tokenStorage.get();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

function getErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  if (!payload) return fallback;

  if (Array.isArray(payload.message)) {
    return payload.message.join(' ');
  }

  return payload.message || payload.error || fallback;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text || undefined;
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? appEnv.requestTimeoutMs,
  );

  try {
    const response = await fetch(buildUrl(path), {
      ...options,
      headers: buildHeaders(options),
      signal: options.signal ?? controller.signal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      if (response.status === 401) {
        tokenStorage.clear();
        window.dispatchEvent(new Event('auth:expired'));
      }

      throw new ApiError(
        getErrorMessage(
          payload as ApiErrorPayload | null,
          'No se pudo completar la petición.',
        ),
        response.status,
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('La petición ha tardado demasiado.', 408);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
