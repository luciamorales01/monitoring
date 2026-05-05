import { useState } from "react";
import { Link } from "react-router-dom";
import "./auth.css";

type RegisterForm = {
  name: string;
  email: string;
  password: string;
};

export default function Register() {
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Registro:", form);
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-header">
          <h1>Crear cuenta</h1>
          <p>Regístrate para acceder a PANORAMA</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Nombre
            <input
              type="text"
              placeholder="Tu nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>

          <label>
            Contraseña
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </label>

          <button type="submit" className="auth-button">
            Crear cuenta
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}