type ErrorSource = 'global-boundary' | 'route-error';

type SerializableErrorPayload = {
  source: ErrorSource;
  message: string;
  stack?: string;
  componentStack?: string;
  pathname: string;
  timestamp: string;
};

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' ? error : 'Unknown application error');
}

export function logAppError(
  error: unknown,
  source: ErrorSource,
  componentStack?: string,
) {
  const normalizedError = toError(error);
  const payload: SerializableErrorPayload = {
    source,
    message: normalizedError.message,
    stack: normalizedError.stack,
    componentStack,
    pathname:
      typeof window !== 'undefined' ? window.location.pathname : 'server',
    timestamp: new Date().toISOString(),
  };

  console.error('[app-error]', payload);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<SerializableErrorPayload>('app:error', {
        detail: payload,
      }),
    );
  }
}

