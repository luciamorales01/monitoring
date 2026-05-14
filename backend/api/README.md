# Monitoring TFG API

Backend NestJS + Prisma + PostgreSQL para una plataforma de monitorización tipo UptimeRobot.

## Requisitos

- Node.js 20+
- PostgreSQL o Supabase
- npm

## Configuración

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

La API arranca por defecto en `http://localhost:3000/api`.

## Scripts útiles

```bash
npm run start:dev      # desarrollo
npm run build          # compilar dist
npm run start:prod     # ejecutar dist/main.js
npm run test           # tests unitarios
npx prisma studio      # inspeccionar base de datos
npx prisma migrate deploy # aplicar migraciones en producción
```

## Endpoints principales

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /monitors`
- `POST /monitors`
- `POST /monitors/:id/run-check`
- `GET /incidents`
- `GET /incidents/active`
- `GET /dashboard/summary`
- `GET /reports/summary?range=24h|7d|30d`

## Variables importantes

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `API_PORT`
- `API_PREFIX`
- `CORS_ORIGINS`
