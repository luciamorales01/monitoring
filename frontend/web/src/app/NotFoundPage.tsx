import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { primaryButtonBase, surfaceCard, uiTheme } from '../theme/commonStyles';

export default function NotFoundPage() {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.code}>404</p>
        <h1 style={styles.title}>Página no encontrada</h1>
        <p style={styles.text}>La ruta solicitada no existe o ha cambiado.</p>
        <Link to="/dashboard" style={styles.button}>
          Ir al dashboard
        </Link>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100%',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: uiTheme.colors.background,
  },
  card: {
    ...surfaceCard,
    maxWidth: 420,
    padding: 32,
    textAlign: 'center',
  },
  code: {
    margin: 0,
    color: uiTheme.colors.primary,
    fontWeight: 800,
    fontSize: 13,
  },
  title: {
    margin: '10px 0 8px',
    fontSize: 26,
  },
  text: {
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
