import { appEnv } from './env';
import { tokenStorage } from './tokenStorage';

type ApiClientOptions = RequestInit & {
  skipAuth?: boolean;
  skipRefresh?: boolean;
  timeoutMs?: number;
};

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

type RefreshResponse = { accessToken: string; refreshToken: string };

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

async function request<T>(path: string, options: ApiClientOptions) {
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

async function tryRefreshSession() {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const refreshed = await request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      skipAuth: true,
      skipRefresh: true,
      body: JSON.stringify({ refreshToken }),
    });

    tokenStorage.set(
      refreshed.accessToken,
      tokenStorage.getPersistence(),
      refreshed.refreshToken,
    );

    return true;
  } catch {
    tokenStorage.clear();
    window.dispatchEvent(new Event('auth:expired'));
    return false;
  }
}

export async function apiClient<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !options.skipAuth &&
      !options.skipRefresh
    ) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        return request<T>(path, options);
      }
    }

    if (error instanceof ApiError && error.status === 401 && !options.skipRefresh) {
      tokenStorage.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }

    throw error;
  }
}
