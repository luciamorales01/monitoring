import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AppErrorFallback } from './AppErrorFallback';
import { logAppError } from './errorLogging';

export default function RouteErrorPage() {
  const error = useRouteError();

  useEffect(() => {
    logAppError(error, 'route-error');
  }, [error]);

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Se ha producido un error';

  const detail = isRouteErrorResponse(error)
    ? error.data?.message ?? 'La ruta no pudo resolverse correctamente.'
    : error instanceof Error
      ? error.message
      : 'Error inesperado en la aplicación.';

  return (
    <AppErrorFallback
      title={title}
      description="La navegación encontró un estado no válido. Puedes reintentar o volver a una ruta segura."
      errorMessage={detail}
      onRetry={() => window.location.reload()}
    />
  );
}
