# Monitoring TFG

Sistema de monitorización web multi-tenant para comprobar disponibilidad, latencia e incidentes de servicios HTTP/HTTPS.

## Objetivo

El proyecto permite a una organización registrar monitores HTTP/HTTPS, ejecutar comprobaciones periódicas, almacenar resultados históricos, detectar caídas, gestionar incidentes y consultar métricas desde un panel web.

## Arquitectura

```txt
monitoring-tfg/
  apps/
    api/        # API REST NestJS
    web/        # Frontend React + Vite
    workers/    # Procesos auxiliares para checks, notificaciones y reportes
  packages/
    shared-types/ # Tipos TypeScript compartidos
  docker-compose.yml
```

La arquitectura separa responsabilidades:

- `web`: interfaz de usuario.
- `api`: autenticación, autorización, persistencia y endpoints REST.
- `postgres`: base de datos relacional.
- `redis`: soporte para colas y procesamiento asíncrono.
- `workers`: tareas de monitorización, notificación y generación de reportes.

## Tecnologías

- React, Vite y TypeScript.
- NestJS y TypeScript.
- Prisma ORM.
- PostgreSQL.
- JWT para autenticación.
- Docker Compose.
- Redis y BullMQ para trabajos asíncronos.
- Jest para pruebas.

## Funcionalidades principales

- Registro y login de usuarios.
- Organizaciones multi-tenant.
- Gestión de usuarios por organización.
- Creación y edición de monitores HTTP/HTTPS.
- Ejecución manual y programada de checks.
- Registro de latencia, código HTTP y estado del monitor.
- Detección y gestión de incidentes.
- Dashboard con métricas generales.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Docker y Docker Compose.

## Instalación local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
npm run dev:web
```

API:

```txt
http://localhost:3000/api
```

Frontend:

```txt
http://localhost:5173
```

## Ejecución con Docker

```bash
cp .env.example .env
docker compose up --build
```

Servicios principales:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## Variables de entorno

Consulta `.env.example` para ver la configuración necesaria.

Variables principales:

- `DATABASE_URL`: conexión de Prisma a PostgreSQL.
- `DIRECT_URL`: conexión directa para migraciones Prisma.
- `JWT_SECRET`: clave privada para firmar tokens JWT.
- `JWT_EXPIRES_IN`: duración del token.
- `CORS_ORIGIN`: orígenes permitidos para el frontend.
- `REDIS_HOST` y `REDIS_PORT`: configuración de Redis.
- `VITE_API_URL`: URL base de la API usada por el frontend.

## Endpoints principales

| Módulo | Endpoint | Descripción |
|---|---|---|
| Auth | `POST /api/auth/register` | Registro inicial de organización y usuario OWNER |
| Auth | `POST /api/auth/login` | Inicio de sesión |
| Auth | `GET /api/auth/me` | Usuario autenticado |
| Monitors | `GET /api/monitors` | Listado de monitores |
| Monitors | `POST /api/monitors` | Crear monitor |
| Monitors | `PATCH /api/monitors/:id` | Actualizar monitor |
| Monitors | `POST /api/monitors/:id/run-check` | Ejecutar check manual |
| Monitors | `GET /api/monitors/:id/checks` | Historial de checks |
| Incidents | `GET /api/incidents` | Listado de incidentes |
| Incidents | `GET /api/incidents/active` | Incidentes abiertos |
| Dashboard | `GET /api/dashboard` | Métricas generales |
| Users | `GET /api/users` | Usuarios de la organización |
| Users | `PATCH /api/users/:id` | Actualizar usuario |

## Pruebas

```bash
npm test
npm --workspace apps/api run test:cov
npm --workspace apps/api run test:e2e
```

## Modelo de datos

Entidades principales:

- `Organization`: organización propietaria de usuarios y monitores.
- `User`: usuario con rol `OWNER`, `ADMIN` o `VIEWER`.
- `Monitor`: servicio HTTP/HTTPS monitorizado.
- `CheckResult`: resultado individual de una comprobación.
- `Incident`: incidencia abierta o resuelta asociada a un monitor.

## Seguridad

Medidas implementadas o previstas:

- Autenticación con JWT.
- Hash de contraseñas con bcrypt.
- Helmet para cabeceras HTTP seguras.
- CORS restringido.
- Validación global de DTOs con `class-validator`.
- Aislamiento por organización.
- Bloqueo de usuarios inactivos.
- Separación de permisos por rol.

## Estado del proyecto

Proyecto en desarrollo para TFG. La base funcional está implementada y los siguientes pasos de mejora son:

1. Completar autorización por roles.
2. Mover checks programados a workers.
3. Añadir documentación Swagger.
4. Ampliar pruebas unitarias y e2e.
5. Mejorar observabilidad con logs estructurados.
