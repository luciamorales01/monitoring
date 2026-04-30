import { useCallback, useState } from 'react';

export function useAsyncAction<TArgs extends unknown[]>(
  action: (...args: TArgs) => Promise<unknown> | unknown,
) {
  const [isRunning, setIsRunning] = useState(false);

  const run = useCallback(
    async (...args: TArgs) => {
      if (isRunning) return;

      setIsRunning(true);

      try {
        await action(...args);
      } finally {
        setIsRunning(false);
      }
    },
    [action, isRunning],
  );

  return { isRunning, run };
}
