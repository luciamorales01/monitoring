import type { CSSProperties } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { primaryButtonBase, surfaceCard, uiTheme } from '../theme/commonStyles';

export default function RouteErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Se ha producido un error';

  const detail = isRouteErrorResponse(error)
    ? error.data?.message ?? 'La ruta no pudo resolverse correctamente.'
    : error instanceof Error
      ? error.message
      : 'Error inesperado en la aplicación.';

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Monitoring TFG</p>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.detail}>{detail}</p>
        <Link to="/dashboard" style={styles.button}>
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: uiTheme.colors.background,
  },
  card: {
    ...surfaceCard,
    maxWidth: 460,
    padding: 32,
    textAlign: 'center',
  },
  kicker: {
    margin: 0,
    color: uiTheme.colors.primary,
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  title: {
    margin: '12px 0 8px',
    fontSize: 28,
    color: uiTheme.colors.text,
  },
  detail: {
    margin: '0 0 22px',
    color: uiTheme.colors.muted,
  },
  button: {
    ...primaryButtonBase,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    padding: '0 16px',
    textDecoration: 'none',
  },
};
