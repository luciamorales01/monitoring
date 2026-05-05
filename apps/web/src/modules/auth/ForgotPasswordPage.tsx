import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('El correo electrónico es obligatorio.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Conectar endpoint real de recuperación cuando exista en authApi.ts.
      console.log('TODO: password recovery', { email: trimmedEmail });
      setSuccessMessage(
        'Si existe una cuenta asociada, recibirás instrucciones para restablecer tu contraseña.',
      );
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'No se pudieron preparar las instrucciones.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Recupera tu acceso"
      subtitle="Te ayudamos a restablecer tu contraseña"
    >
      <p className="login-helper">
        Introduce tu correo electrónico y te enviaremos las instrucciones para
        recuperar el acceso a tu cuenta.
      </p>

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <label>
          Correo electrónico
          <div className={`input-wrap${error ? ' input-error' : ''}`}>
            <span>✉</span>
            <input
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(error)}
              required
            />
          </div>
          {error ? <span className="field-error">{error}</span> : null}
        </label>

        {submitError ? (
          <p className="form-message form-message-error">{submitError}</p>
        ) : null}

        {successMessage ? (
          <p className="form-message form-message-success">{successMessage}</p>
        ) : null}

        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? 'Preparando...' : 'Enviar instrucciones'}
        </button>
      </form>

      <p className="login-footer">
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
