import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from './authApi';
import AuthLayout from './AuthLayout';
import { tokenStorage } from '../../shared/tokenStorage';

type RegisterErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  organizationName?: string;
  acceptTerms?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors: RegisterErrors = {};

    if (!name.trim()) {
      nextErrors.name = 'El nombre es obligatorio.';
    }

    if (!organizationName.trim()) {
      nextErrors.organizationName = 'El nombre de la organización es obligatorio.';
    }

    if (!email.trim()) {
      nextErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = 'Introduce un correo electrónico válido.';
    }

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirma tu contraseña.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (!acceptTerms) {
      nextErrors.acceptTerms = 'Debes aceptar los términos.';
    }

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        organizationName: organizationName.trim(),
      });

      tokenStorage.set(res.accessToken, 'local', res.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'No se pudo crear la cuenta.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza a monitorizar tu infraestructura"
    >
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <label>
          Nombre
          <div className={`input-wrap${errors.name ? ' input-error' : ''}`}>
            <span>👤</span>
            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              required
            />
          </div>
          {errors.name ? <span className="field-error">{errors.name}</span> : null}
        </label>


        <label>
          Organización
          <div className={`input-wrap${errors.organizationName ? ' input-error' : ''}`}>
            <span>🏢</span>
            <input
              type="text"
              placeholder="Nombre de tu organización"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              autoComplete="organization"
              aria-invalid={Boolean(errors.organizationName)}
              required
            />
          </div>
          {errors.organizationName ? (
            <span className="field-error">{errors.organizationName}</span>
          ) : null}
        </label>

        <label>
          Correo electrónico
          <div className={`input-wrap${errors.email ? ' input-error' : ''}`}>
            <span>✉</span>
            <input
              type="email"
              placeholder="tu@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              required
            />
          </div>
          {errors.email ? (
            <span className="field-error">{errors.email}</span>
          ) : null}
        </label>

        <label>
          Contraseña
          <div className={`input-wrap${errors.password ? ' input-error' : ''}`}>
            <span>🔒</span>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              required
            />
          </div>
          {errors.password ? (
            <span className="field-error">{errors.password}</span>
          ) : null}
        </label>

        <label>
          Confirmar contraseña
          <div
            className={`input-wrap${errors.confirmPassword ? ' input-error' : ''}`}
          >
            <span>🔐</span>
            <input
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              required
            />
          </div>
          {errors.confirmPassword ? (
            <span className="field-error">{errors.confirmPassword}</span>
          ) : null}
        </label>

        <div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
            />
            <span className="checkbox-text">
              Acepto los términos y condiciones del servicio
            </span>
          </label>
          {errors.acceptTerms ? (
            <span className="field-error">{errors.acceptTerms}</span>
          ) : null}
        </div>

        {submitError ? (
          <p className="form-message form-message-error">{submitError}</p>
        ) : null}

        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="login-footer">
        ¿Ya tienes una cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}
