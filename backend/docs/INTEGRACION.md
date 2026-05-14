# Integración fase 1

Este paquete contiene únicamente los `src/` revisados de API y web, más `.env.example` y una guía mínima.

## Orden recomendado

1. Crea una rama nueva:

```bash
git checkout -b refactor/fase-1-profesional
```

2. Haz copia del estado actual o confirma que Git está limpio:

```bash
git status
```

3. Copia `api/src` sobre el `src` de tu backend.
4. Copia `web/src` sobre el `src` de tu frontend.
5. Copia y adapta los `.env.example`.

## Dependencias probables en API

```bash
npm install @nestjs/config joi helmet cookie-parser
npm install -D @types/cookie-parser
```

Si no estaban instaladas:

```bash
npm install class-validator class-transformer
```

## Variables API

- `NODE_ENV`
- `PORT`
- `GLOBAL_PREFIX`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`

## Variables WEB

- `VITE_APP_NAME`
- `VITE_API_URL`
- `VITE_REQUEST_TIMEOUT_MS`

## Comprobaciones

Backend:

```bash
npm run start:dev
```

Frontend:

```bash
npm run dev
```

Prueba manual mínima:

1. Registro de usuario.
2. Login.
3. Crear monitor.
4. Ver detalle de monitor.
5. Consultar incidentes.
6. Recargar navegador y comprobar sesión.
7. Forzar token inválido y comprobar cierre de sesión.

## Cambios sensibles

- JWT ya no usa fallback inseguro.
- El backend falla al arrancar si faltan variables críticas.
- CORS sale de entorno.
- Registro de organización + usuario usa transacción.
- Monitor target incluye validación contra SSRF básica.
- Cliente web centraliza errores, timeout y expiración de sesión.
