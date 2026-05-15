import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { resetPassword } from './authApi';
import PasswordInput from '../../shared/PasswordInput';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setSuccessMessage('');

    if (!token) {
      setSubmitError('El enlace de recuperación no es válido.');
      return;
    }

    if (password.length < 6) {
      setSubmitError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Las contraseñas no coinciden.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ token, password });
      setSuccessMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
      window.setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Restablece el acceso a tu cuenta">
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <label>
          Nueva contraseña
          <div className="input-wrap">
            <span>🔒</span>
            <PasswordInput
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </label>

        <label>
          Confirmar contraseña
          <div className="input-wrap">
            <span>🔐</span>
            <PasswordInput
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </label>

        {submitError ? <p className="form-message form-message-error">{submitError}</p> : null}
        {successMessage ? <p className="form-message form-message-success">{successMessage}</p> : null}

        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>

      <p className="login-footer">
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
