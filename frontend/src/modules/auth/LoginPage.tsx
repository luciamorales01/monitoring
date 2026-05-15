import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login } from './authApi';
import AuthLayout from './AuthLayout';
import PasswordInput from '../../shared/PasswordInput';
import { tokenStorage } from '../../shared/tokenStorage';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    if (!email.trim() || !password) {
      setSubmitError('Completa correo electrónico y contraseña.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login({ email: email.trim(), password, rememberMe: rememberSession });
      tokenStorage.set(
        res.accessToken,
        rememberSession ? 'local' : 'session',
        res.refreshToken,
      );
      const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Inicia sesión para continuar"
    >
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <label>
          Correo electrónico
          <div className="input-wrap">
            <span>✉</span>
            <input
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </label>

        <label>
          Contraseña
          <div className="input-wrap">
            <span>🔒</span>
            <PasswordInput
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
        </label>

        <div className="login-options">
          <label className="remember">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
            />
            Recordarme
          </label>

          <Link to="/recuperar-password">¿Olvidaste tu contraseña?</Link>
        </div>

        {submitError ? (
          <p className="form-message form-message-error">{submitError}</p>
        ) : null}

        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="login-footer">
        ¿No tienes una cuenta? <Link to="/registro">Crea una ahora</Link>
      </p>
    </AuthLayout>
  );
}
