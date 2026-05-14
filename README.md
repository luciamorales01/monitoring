# Monitoring TFG

SaaS multi-tenant de monitorizacion web inspirado en UptimeRobot. Permite registrar monitores HTTP/HTTPS y otros tipos de comprobaciones, ejecutar checks periodicos, almacenar historico de disponibilidad, detectar incidentes, notificar eventos relevantes y consultar metricas desde un panel web.

El proyecto esta orientado a un Trabajo de Fin de Grado y mantiene una arquitectura modular exclusivamente web, preparada para evolucionar hacia despliegues productivos con API, frontend React, base de datos, Redis y workers independientes.

## Contenido

- [Descripcion](#descripcion)
- [Tecnologias](#tecnologias)
- [Arquitectura](#arquitectura)
- [Instalacion local](#instalacion-local)
- [Variables de entorno](#variables-de-entorno)
- [Comandos](#comandos)
- [Workers](#workers)
- [Despliegue](#despliegue)
- [Capturas](#capturas)
- [Futuras mejoras](#futuras-mejoras)

## Descripcion

Monitoring TFG centraliza la supervision de servicios web para organizaciones. Cada organizacion opera en un contexto aislado y puede gestionar usuarios, secciones, monitores, checks, incidencias, notificaciones y reportes.

La plataforma no incluye aplicacion movil. El alcance actual es frontend web, API backend, base de datos y workers BullMQ.

Funcionalidades principales:

- Autenticacion con JWT, refresh tokens e invitaciones de usuarios.
- Modelo multi-tenant con aislamiento por organizacion.
- Roles `OWNER`, `ADMIN` y `VIEWER`.
- Gestion de monitores HTTP/HTTPS, SSL, TCP y DNS.
- Checks manuales y programados.
- Registro de latencia, codigo de estado, errores y estado actual.
- Gestion de incidentes abiertos, reconocidos y resueltos.
- Notificaciones por eventos de caida y recuperacion.
- Dashboard con metricas operativas.
- Pagina publica de estado.
- Reportes exportables.
- Documentacion Swagger para la API.

## Tecnologias

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Query
- React Router
- React Hook Form
- Zod
- Recharts
- Tailwind CSS

### Backend

- NestJS 11
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT y Passport
- BullMQ
- Redis
- Nodemailer
- Swagger/OpenAPI
- Jest

### Infraestructura

- Docker
- Docker Compose
- Nginx para servir el frontend en produccion
- Node.js 20+
- npm 10+

## Arquitectura

```txt
monitoring-tfg/
  apps/
    api/                         # API REST NestJS
    web/                         # Frontend React + Vite
    workers/
      monitoring-worker/         # Worker BullMQ para checks de monitores
      notifications-worker/      # Worker reservado para notificaciones async
  packages/
    shared-types/                # Tipos TypeScript compartidos
  docs/                          # Documentacion auxiliar
  docker-compose.yml             # PostgreSQL, Redis, API y Web
```

Flujo principal:

```txt
Usuario -> Web React -> API NestJS -> PostgreSQL
                         |
                         v
                       Redis
                         |
                         v
                Workers BullMQ
```

Responsabilidades:

- `apps/web`: interfaz SaaS, formularios, dashboard, paginas privadas y pagina publica de estado.
- `apps/api`: autenticacion, autorizacion, reglas multi-tenant, endpoints REST, Prisma, Swagger y publicacion de jobs.
- `apps/workers/monitoring-worker`: consume la cola `monitor-checks`, ejecuta checks automatizados y evita duplicados con locks en Redis.
- `packages/shared-types`: contratos TypeScript compartidos entre aplicaciones.
- `postgres`: persistencia relacional de organizaciones, usuarios, monitores, checks e incidentes.
- `redis`: backend de colas BullMQ y locks distribuidos.

## Instalacion local

### Requisitos

- Node.js `>=20`
- npm `>=10`
- Docker y Docker Compose
- PostgreSQL y Redis locales, o los servicios levantados con Docker

### Pasos

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

3. Levantar PostgreSQL y Redis:

```bash
docker compose up postgres redis
```

> Nota: el `docker-compose.yml` expone PostgreSQL en `localhost:5433`. Si usas ese servicio desde el host, ajusta `DATABASE_URL` y `DIRECT_URL` a `postgresql://monitoring:monitoring@localhost:5433/monitoring`.

4. Generar cliente Prisma:

```bash
npm run prisma:generate
```

5. Ejecutar migraciones:

```bash
npm run prisma:migrate
```

6. Iniciar API:

```bash
npm run dev:api
```

7. Iniciar web:

```bash
npm run dev:web
```

Servicios locales:

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- PostgreSQL Docker: `localhost:5433`
- Redis Docker: `localhost:6379`

## Variables de entorno

### Raiz (`.env`)

| Variable | Ejemplo | Descripcion |
| --- | --- | --- |
| `NODE_ENV` | `development` | Entorno de ejecucion. |
| `PORT` | `3000` | Puerto de la API cuando se usa configuracion raiz. |
| `GLOBAL_PREFIX` | `api` | Prefijo global de endpoints. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido para CORS. |
| `JWT_SECRET` | `change-me-use-a-long-random-secret` | Secreto para firmar tokens JWT. Debe cambiarse en produccion. |
| `JWT_EXPIRES_IN` | `1d` | Duracion del access token. |
| `POSTGRES_DB` | `monitoring` | Base de datos usada por Docker Compose. |
| `POSTGRES_USER` | `monitoring` | Usuario de PostgreSQL. |
| `POSTGRES_PASSWORD` | `monitoring` | Password de PostgreSQL. |
| `DATABASE_URL` | `postgresql://...` | URL principal de Prisma. |
| `DIRECT_URL` | `postgresql://...` | URL directa para migraciones Prisma. |
| `REDIS_HOST` | `localhost` | Host de Redis. |
| `REDIS_PORT` | `6379` | Puerto de Redis. |
| `REDIS_PASSWORD` | | Password de Redis si aplica. |
| `VITE_API_URL` | `http://localhost:3000/api` | URL de API consumida por el frontend. |

### API (`apps/api/.env`)

| Variable | Descripcion |
| --- | --- |
| `DATABASE_URL` | Conexion Prisma a PostgreSQL. |
| `DIRECT_URL` | Conexion directa para migraciones. |
| `JWT_SECRET` | Secreto de access tokens. |
| `JWT_EXPIRES_IN` | Duracion del access token. |
| `JWT_REFRESH_EXPIRES_IN` | Duracion del refresh token. |
| `JWT_REMEMBER_ME_EXPIRES_IN` | Duracion del token con "remember me". |
| `PASSWORD_RESET_TOKEN_MINUTES` | Validez de tokens de recuperacion. |
| `API_PORT` | Puerto de la API. |
| `API_PREFIX` | Prefijo global, normalmente `api`. |
| `CORS_ORIGINS` | Lista de origenes permitidos separada por comas. |
| `APP_NAME` | Nombre visible de la aplicacion. |
| `FRONTEND_URL` | URL publica del frontend para enlaces de recuperacion. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `NOTIFICATIONS_FROM` | Configuracion usada por `notifications-worker`. La API solo encola jobs. |

### Web (`apps/web/.env`)

| Variable | Descripcion |
| --- | --- |
| `VITE_APP_NAME` | Nombre mostrado en el frontend. |
| `VITE_API_URL` | URL base de la API. |
| `VITE_REQUEST_TIMEOUT_MS` | Timeout de peticiones HTTP. |

### Workers

| Variable | Descripcion |
| --- | --- |
| `REDIS_URL` | URL completa de Redis. Tiene prioridad sobre host/puerto. |
| `REDIS_HOST` | Host de Redis si no se usa `REDIS_URL`. |
| `REDIS_PORT` | Puerto de Redis si no se usa `REDIS_URL`. |
| `MONITOR_CHECK_WORKER_CONCURRENCY` | Concurrencia del worker de checks. Valor por defecto: `5`. |
| `MONITOR_CHECK_LOCK_TTL_MS` | TTL del lock por monitor. Valor por defecto: `300000`. |
| `NOTIFICATIONS_WORKER_CONCURRENCY` | Concurrencia del worker de emails. Valor por defecto: `5`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `NOTIFICATIONS_FROM` | SMTP de Gmail/Nodemailer. Si falta configuracion, el worker loguea el email y no falla. |
| `DATABASE_URL` | Conexion a PostgreSQL necesaria para el worker de monitorizacion. |
| `DIRECT_URL` | Conexion directa para Prisma si el worker inicializa cliente Prisma. |

## Comandos

### Monorepo

```bash
npm run dev:api
npm run dev:web
npm run build
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run docker:up
npm run docker:down
```

### API

```bash
npm --workspace apps/api run start:dev
npm --workspace apps/api run build
npm --workspace apps/api run start:prod
npm --workspace apps/api run lint
npm --workspace apps/api run test
npm --workspace apps/api run test:cov
npm --workspace apps/api run test:e2e
npm --workspace apps/api run prisma:studio
```

### Web

```bash
npm --workspace apps/web run dev
npm --workspace apps/web run build
npm --workspace apps/web run lint
npm --workspace apps/web run preview
```

### Workers

Los workers tienen sus propios `package.json`. Ejecutalos desde su carpeta:

```bash
cd apps/workers/monitoring-worker
npm install
npm run dev
npm run build
npm run start
```

```bash
cd apps/workers/notifications-worker
npm install
npm run dev
```

## Workers

### Monitoring worker

`apps/workers/monitoring-worker` consume la cola BullMQ `monitor-checks`.

Caracteristicas:

- Job name: `run-monitor-check`.
- Datos del job: `monitorId`, `requestedAt` y `source`.
- Concurrencia configurable con `MONITOR_CHECK_WORKER_CONCURRENCY`.
- Lock por monitor en Redis para evitar checks duplicados.
- Cierre ordenado en `SIGINT` y `SIGTERM`.
- Logs estructurados en JSON.
- Reutiliza servicios NestJS de la API mediante un contexto de aplicacion.

### Notifications worker

`apps/workers/notifications-worker` esta preparado como proceso independiente para mover el envio de notificaciones fuera del ciclo principal de la API.

Uso esperado:

- Consumir jobs de notificacion.
- Enviar emails o integraciones externas.
- Reintentar fallos con politicas de BullMQ.
- Mantener historial de eventos de notificacion.

## Despliegue

### Docker Compose

El proyecto incluye `docker-compose.yml` para levantar:

- PostgreSQL 16
- Redis 7
- API NestJS
- Frontend React servido con Nginx

```bash
cp .env.example .env
docker compose up --build
```

URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

### Produccion

Recomendaciones:

- Usar secretos reales para `JWT_SECRET`, credenciales de PostgreSQL, Redis y SMTP.
- Ejecutar migraciones Prisma antes de arrancar la nueva version.
- Separar API, frontend, Redis, PostgreSQL y workers en servicios independientes.
- Configurar HTTPS en el proxy o balanceador.
- Limitar CORS a dominios reales.
- Activar backups periodicos de PostgreSQL.
- Monitorizar logs, latencia, errores y uso de colas.
- Definir politicas de restart para API y workers.
- No exponer Prisma Studio en produccion.

Ejemplo de orden de despliegue:

```bash
npm ci
npm run prisma:generate
npm --workspace apps/api run build
npm --workspace apps/web run build
npm run prisma:migrate
npm --workspace apps/api run start:prod
```

## Capturas

> Sustituir estos placeholders por capturas reales del producto.

### Dashboard

![Dashboard](docs/screenshots/dashboard-placeholder.png)

### Monitores

![Monitores](docs/screenshots/monitors-placeholder.png)

### Detalle de monitor

![Detalle de monitor](docs/screenshots/monitor-detail-placeholder.png)

### Incidentes

![Incidentes](docs/screenshots/incidents-placeholder.png)

### Pagina publica de estado

![Pagina publica de estado](docs/screenshots/public-status-placeholder.png)

## Modelo de datos

Entidades principales:

- `Organization`: tenant principal.
- `User`: usuario asociado a una organizacion.
- `Monitor`: recurso monitorizado.
- `CheckResult`: resultado individual de una comprobacion.
- `Incident`: incidencia asociada a un monitor.
- `NotificationEvent`: evento de notificacion.
- `RefreshToken`: sesion persistente.
- `UserInvitation`: invitacion a una organizacion.
- `PasswordResetToken`: recuperacion de password.
- `Section`: agrupacion de monitores.
- `SectionMember`: usuarios asociados a secciones.
- `SectionMonitor`: monitores asociados a secciones.

## Seguridad

- Hash de passwords con bcrypt.
- JWT para autenticacion.
- Refresh tokens persistidos como hash.
- Validacion global con `class-validator`.
- `ValidationPipe` con `whitelist`, `transform` y `forbidNonWhitelisted`.
- Helmet para cabeceras HTTP.
- CORS restringido por entorno.
- Separacion por tenant en servicios.
- Roles para acciones administrativas.
- Cookies parseadas por API para flujos de autenticacion.

## Testing

El backend usa Jest para pruebas unitarias y e2e.

```bash
npm test
npm --workspace apps/api run test:cov
npm --workspace apps/api run test:e2e
```

Buenas practicas del proyecto:

- Patron AAA: arrange, act, assert.
- Mocks para servicios externos.
- Casos de error y permisos.
- Cobertura de reglas multi-tenant.

## Futuras mejoras

- Completar extraccion de notificaciones y reportes a workers dedicados.
- Anadir despliegue especifico de workers en Docker Compose.
- Incorporar rate limiting en endpoints de autenticacion.
- Mejorar observabilidad con logs estructurados, trazas y metricas.
- Anadir healthchecks publicos para API y workers.
- Ampliar cobertura e2e de flujos criticos.
- Gestion avanzada de canales de alerta: Slack, webhooks y email.
- Checks multi-region.
- Ventanas de mantenimiento.
- SLA/SLO por monitor y por organizacion.
- Historico agregado para reducir coste de almacenamiento.
- Panel de administracion global.
- Exportacion avanzada de reportes.
- CI/CD con lint, tests, build y migraciones controladas.

## Licencia

Proyecto privado desarrollado para TFG.
