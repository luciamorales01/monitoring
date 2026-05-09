import { appEnv } from '../shared/env';
import './error-ui.css';

type AppErrorFallbackProps = {
  description: string;
  errorMessage?: string;
  onRetry: () => void;
  title: string;
};

export function AppErrorFallback({
  description,
  errorMessage,
  onRetry,
  title,
}: AppErrorFallbackProps) {
  return (
    <main className="app-error-shell">
      <section className="app-error-card" role="alert" aria-live="assertive">
        <span className="app-error-badge">{appEnv.appName}</span>
        <h1 className="app-error-title">{title}</h1>
        <p className="app-error-description">{description}</p>
        {errorMessage ? (
          <p className="app-error-message">
            <strong>Detalle:</strong> {errorMessage}
          </p>
        ) : null}
        <div className="app-error-actions">
          <button
            className="app-error-button app-error-button-primary"
            type="button"
            onClick={onRetry}
          >
            Reintentar
          </button>
          <a
            className="app-error-button app-error-button-secondary"
            href="/dashboard"
          >
            Ir al dashboard
          </a>
        </div>
        <p className="app-error-help">
          Si el problema persiste, recarga la página o vuelve a iniciar sesión.
        </p>
      </section>
    </main>
  );
}

