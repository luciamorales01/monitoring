# Fase 6 - Status page PRO + SLA

Esta fase mejora la página pública de estado sin añadir nuevas migraciones.

## Cambios backend

- `/status/public/:slug` devuelve resumen profesional:
  - uptime global 30 días
  - respuesta media
  - downtime estimado
  - checks analizados
  - incidencias activas
  - incidencias recientes
- Cada monitor público incluye:
  - SLA 30 días
  - respuesta media 30 días
  - histórico diario de uptime

## Cambios frontend

- Rediseño completo de `/status/:slug`.
- Hero más profesional.
- KPIs públicos.
- SLA por servicio.
- Barra de histórico de 30 días por monitor.
- Panel de incidencias activas.
- Historial reciente.

## Comandos

```bash
cd apps/api
npm run build
npm run start:dev
```

```bash
cd apps/web
npm run build
npm run dev
```

No requiere `npx prisma migrate dev` porque no modifica la base de datos.
