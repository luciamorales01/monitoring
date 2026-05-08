# Fase 5 - Auth profesional

Incluye:
- Refresh token persistente.
- Login con `rememberMe` real.
- Restauración automática de sesión al recargar.
- Logout que revoca refresh token.
- Recuperar contraseña.
- Restablecer contraseña desde `/restablecer-password?token=...`.
- Cambiar contraseña desde `Mi perfil > Seguridad`.
- Revocación de sesiones activas al cambiar/restablecer contraseña.

## Pasos

```bash
cd api
npm install
npx prisma generate
npx prisma migrate dev
npm run build
```

```bash
cd web
npm install
npm run build
```

## Variables nuevas recomendadas

```env
JWT_REFRESH_EXPIRES_IN=86400
JWT_REMEMBER_ME_EXPIRES_IN=31536000
PASSWORD_RESET_TOKEN_MINUTES=30
APP_URL=http://localhost:5173
```

En desarrollo, `/auth/forgot-password` devuelve `resetUrl` para probar el flujo sin SMTP. En producción no devuelve el token.
