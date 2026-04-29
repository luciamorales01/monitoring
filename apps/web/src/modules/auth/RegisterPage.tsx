import { useState } from 'react';
import { register } from './authApi';
import { tokenStorage } from '../../shared/tokenStorage';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await register({
        name,
        email,
        password,
        organizationName,
      });

      tokenStorage.set(res.accessToken);
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br />
        <input
          placeholder="Empresa"
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
        />
        <br />
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />
        <button type="submit">Registrarse</button>
      </form>
    </div>
  );
}