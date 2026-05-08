import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { acceptInvitation } from './authApi';
import { tokenStorage } from '../../shared/tokenStorage';

export default function AcceptInvitationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('La invitación no es válida o no contiene token.');
      return;
    }

    if (!name.trim()) {
      setError('Introduce tu nombre.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await acceptInvitation({ token, name: name.trim(), password });
      tokenStorage.set(session.accessToken, 'local', session.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'No se pudo aceptar la invitación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Aceptar invitación" subtitle="Crea tu acceso para entrar en el equipo">
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        <label>
          Nombre
          <div className="input-wrap">
            <span>👤</span>
            <input
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>
        </label>

        <label>
          Contraseña
          <div className="input-wrap">
            <span>🔒</span>
            <input
              type="password"
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
            <input
              type="password"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
        </label>

        {error ? <p className="form-message form-message-error">{error}</p> : null}

        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta...' : 'Aceptar invitación'}
        </button>
      </form>

      <p className="login-footer">
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
