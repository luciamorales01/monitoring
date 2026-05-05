import { useState } from "react";
import { Link } from "react-router-dom";
import "./auth.css";

type LoginForm = {
  email: string;
  password: string;
};

export default function Login() {
  const [form, setForm] = useState<LoginForm>({
    email: "lucia@demo.com",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Login:", form);
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-header">
          <h1>PANORAMA</h1>
          <p>Accede a tu panel de gestión turística</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              placeholder="lucia@demo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              placeholder="Introduce tu contraseña"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>

          <button type="submit" className="auth-button">
            Iniciar sesión
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </section>
    </main>
  );
}