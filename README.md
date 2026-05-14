# Monitoring TFG

Monitoring TFG es una plataforma SaaS multi-tenant de monitorizacion web inspirada en herramientas como UptimeRobot. Permite registrar monitores HTTP/HTTPS y otros tipos de comprobaciones, ejecutar checks periodicos, almacenar historico de disponibilidad, detectar incidentes, enviar notificaciones y visualizar metricas en tiempo real desde un panel web.

El proyecto esta desarrollado como Trabajo de Fin de Grado (TFG) y mantiene una arquitectura modular basada en frontend React, API NestJS, PostgreSQL, Redis y workers independientes con BullMQ.

---

# Caracteristicas principales

- Arquitectura SaaS multi-tenant.
- Sistema de autenticacion JWT con refresh tokens.
- Roles `OWNER`, `ADMIN` y `VIEWER`.
- Gestion de monitores HTTP/HTTPS, SSL, TCP y DNS.
- Checks manuales y automaticos.
- Registro historico de disponibilidad y latencia.
- Gestion de incidentes.
- Dashboard con metricas operativas.
- Workers asincronos con BullMQ.
- Notificaciones por email.
- Swagger/OpenAPI.
- Reportes y graficas.
- Pagina publica de estado.

---

# Tecnologias

## Frontend

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- Recharts

## Backend

- NestJS 11
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT + Passport
- BullMQ
- Redis
- Nodemailer
- Swagger/OpenAPI
- Jest

## Infraestructura

- Docker
- Docker Compose
- Redis
- PostgreSQL
- Node.js 20+
- npm 10+

---

# Arquitectura

```txt
monitoring/
├── backend/
│   ├── api/
│   │   ├── prisma/
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── workers/
│   │   ├── monitoring-worker/
│   │   └── notifications-worker/
│   │
│   ├── shared-types/
│   ├── docker-compose.yml
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── package.json
│   └── .env
│
├── docs/
└── .gitignore
````

---

# Flujo general

```txt
Usuario
   ↓
Frontend React
   ↓
API NestJS
   ↓
PostgreSQL
   ↓
Redis
   ↓
Workers BullMQ
```

---

# Responsabilidades

## Frontend (`frontend/web`)

* Dashboard SaaS.
* Gestion de monitores.
* Gestion de incidencias.
* Graficas y estadisticas.
* Formularios y autenticacion.
* Pagina publica de estado.

## API (`backend/api`)

* API REST NestJS.
* Autenticacion JWT.
* Reglas multi-tenant.
* Prisma ORM.
* Swagger/OpenAPI.
* Publicacion de jobs BullMQ.

## Monitoring Worker (`backend/workers/monitoring-worker`)

* Consume la cola `monitor-checks`.
* Ejecuta checks periodicos.
* Evita duplicados usando locks Redis.
* Guarda resultados e incidentes.

## Notifications Worker (`backend/workers/notifications-worker`)

* Procesa eventos asincronos.
* Gestiona emails y alertas.
* Reintentos con BullMQ.

## PostgreSQL

Persistencia de:

* organizaciones
* usuarios
* monitores
* checks
* incidencias
* tokens
* reportes

## Redis

* Backend BullMQ.
* Colas asincronas.
* Locks distribuidos.

---

# Instalacion local

## Requisitos

* Node.js >=20
* npm >=10
* Docker Desktop
* Docker Compose

---

# Backend

## 1. Entrar en backend

```bash
cd backend
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar variables de entorno

Crear:

```txt
backend/.env
```

Ejemplo:

```env
NODE_ENV=development

API_PORT=3000
API_PREFIX=api

DATABASE_URL="postgresql://monitoring:monitoring@localhost:5433/monitoring"
DIRECT_URL="postgresql://monitoring:monitoring@localhost:5433/monitoring"

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGINS=http://localhost:5173
```

---

## 4. Levantar PostgreSQL y Redis

```bash
docker compose up -d
```

Servicios:

* PostgreSQL → puerto `5433`
* Redis → puerto `6379`

---

## 5. Generar Prisma Client

```bash
npm run api:prisma:generate
```

---

## 6. Ejecutar backend completo

```bash
npm run dev
```

Este comando inicia:

* API NestJS
* Monitoring Worker
* Notifications Worker

---

# Frontend

## 1. Entrar en frontend

```bash
cd frontend
```

---

## 2. Instalar dependencias

```bash
npm install
```

---

## 3. Configurar variables de entorno

Crear:

```txt
frontend/web/.env
```

Ejemplo:

```env
VITE_APP_NAME=Monitoring
VITE_API_URL=http://localhost:3000/api
VITE_REQUEST_TIMEOUT_MS=10000
```

---

## 4. Ejecutar frontend

```bash
npm run dev
```

---

# URLs locales

| Servicio   | URL                                                              |
| ---------- | ---------------------------------------------------------------- |
| Frontend   | [http://localhost:5173](http://localhost:5173)                   |
| API        | [http://localhost:3000/api](http://localhost:3000/api)           |
| Swagger    | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) |
| PostgreSQL | localhost:5433                                                   |
| Redis      | localhost:6379                                                   |

---

# Scripts disponibles

## Backend

Desde:

```bash
cd backend
```

### Desarrollo completo

```bash
npm run dev
```

### Solo API

```bash
npm run dev:api
```

### Solo Monitoring Worker

```bash
npm run dev:monitoring
```

### Solo Notifications Worker

```bash
npm run dev:notifications
```

### Build

```bash
npm run build
```

### Docker

```bash
npm run docker:up
```

---

## Frontend

Desde:

```bash
cd frontend
```

### Desarrollo

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

---

# Workers

## Monitoring Worker

Ubicacion:

```txt
backend/workers/monitoring-worker
```

Caracteristicas:

* Cola BullMQ `monitor-checks`
* Locks Redis
* Concurrencia configurable
* Logs estructurados
* Integracion con NestJS

---

## Notifications Worker

Ubicacion:

```txt
backend/workers/notifications-worker
```

Caracteristicas:

* Envio asincrono de emails
* Reintentos automaticos
* Procesamiento desacoplado
* Preparado para futuras integraciones

---

# Swagger

La documentacion OpenAPI esta disponible en:

```txt
http://localhost:3000/api/docs
```

Incluye:

* endpoints
* autenticacion
* DTOs
* respuestas
* modelos Prisma

---

# Modelo de datos

Entidades principales:

* Organization
* User
* Monitor
* CheckResult
* Incident
* NotificationEvent
* RefreshToken
* UserInvitation
* PasswordResetToken
* Section
* SectionMember
* SectionMonitor

---

# Seguridad

* JWT authentication.
* Refresh tokens persistidos.
* Hash de passwords con bcrypt.
* ValidationPipe global.
* Helmet.
* CORS restringido.
* Roles y permisos.
* Separacion multi-tenant.
* Validacion DTO con class-validator.

---

# Testing

El backend utiliza Jest para:

* tests unitarios
* tests de integracion
* tests e2e

Ejecutar:

```bash
cd backend/api
npm run test
npm run test:cov
npm run test:e2e
```

Buenas practicas:

* AAA pattern
* mocks
* edge cases
* cobertura multi-tenant

---

# Docker

El backend incluye `docker-compose.yml` para:

* PostgreSQL
* Redis

Ejecutar:

```bash
cd backend
docker compose up -d
```

---

# Produccion

Recomendaciones:

* usar HTTPS
* limitar CORS
* activar backups PostgreSQL
* monitorizar logs
* separar workers
* usar secretos reales
* no exponer Prisma Studio
* activar politicas restart Docker

---

# Capturas

## Dashboard

![Dashboard](docs/screenshots/dashboard-placeholder.png)

## Monitores

![Monitores](docs/screenshots/monitors-placeholder.png)

## Detalle monitor

![Detalle](docs/screenshots/monitor-detail-placeholder.png)

## Incidentes

![Incidentes](docs/screenshots/incidents-placeholder.png)

---

# Futuras mejoras

* Checks multi-region.
* Integraciones Slack/webhooks.
* Healthchecks publicos.
* Mejor observabilidad.
* Rate limiting.
* CI/CD automatizado.
* SLA/SLO por monitor.
* Ventanas de mantenimiento.
* Exportacion avanzada.
* Despliegue independiente de workers.
* Sistema de planes y billing.

---

# Licencia

Proyecto privado desarrollado como Trabajo de Fin de Grado.


