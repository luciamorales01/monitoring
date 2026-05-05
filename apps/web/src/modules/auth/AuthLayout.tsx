import type { ReactNode } from 'react';
import '../../pages/auth.css';

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <main className="login-page">
      <section className="login-shell">
        <aside className="login-brand">
          <div className="brand-logo">
            <div className="brand-icon">⌁</div>
            <span>
              Monitoring<strong>TFG</strong>
            </span>
          </div>

          <div className="brand-copy">
            <h1>
              Monitoriza.
              <br />
              Detecta.
              <br />
              <span>Responde.</span>
            </h1>

            <p>
              Supervisa todos tus sistemas y servicios en tiempo real. Recibe
              alertas, analiza incidencias y asegura la disponibilidad de tu
              infraestructura.
            </p>
          </div>

          <div className="brand-features">
            <div>
              <span>↗</span>
              <p>
                <strong>Monitoreo en tiempo real</strong>
                Estado y rendimiento al instante
              </p>
            </div>

            <div>
              <span>🔔</span>
              <p>
                <strong>Alertas inteligentes</strong>
                Notificaciones inmediatas de incidencias
              </p>
            </div>

            <div>
              <span>▥</span>
              <p>
                <strong>Análisis detallado</strong>
                Métricas y reportes en profundidad
              </p>
            </div>
          </div>

          <div className="brand-illustration">
            <div className="server-stack">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="mini-dashboard">
              <div className="status-pill">● Operativo</div>
              <div className="chart-line"></div>
              <div className="chart-circle"></div>
            </div>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-box">
            <div className="login-header">
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>

            {children}
          </div>
        </section>
      </section>
    </main>
  );
}
