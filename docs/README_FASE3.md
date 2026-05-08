# Fase 3 - Incidencias profesionales + estado público

Copia las carpetas `api` y `web` encima de tu proyecto.

## Cambios incluidos

### Backend
- `IncidentStatus` ahora permite `OPEN`, `ACKNOWLEDGED`, `RESOLVED`.
- Nuevo enum `IncidentSeverity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- Nuevos campos en incidencia:
  - `severity`
  - `acknowledgedAt`
  - `acknowledgedById`
  - `resolvedById`
  - `resolutionNote`
  - `rootCause`
  - `lastStatusChangeAt`
- Nuevos endpoints:
  - `PATCH /incidents/:id/acknowledge`
  - `PATCH /incidents/:id/resolve`
  - `PATCH /incidents/:id/severity`
  - `GET /status/public/:slug`

### Frontend
- La pantalla de detalle de incidencia ahora permite:
  - reconocer incidencia,
  - resolver incidencia,
  - cambiar severidad,
  - guardar causa raíz,
  - guardar nota de resolución.
- La lista de incidencias entiende el estado `ACKNOWLEDGED`.
- Nueva página pública de estado:
  - `/status/:slug`

Ejemplo: si tu organización tiene slug `monitoring`, la URL pública será `/status/monitoring`.

## Comandos después de copiar

En backend:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run build
```

En frontend:

```bash
npm install
npm run build
```

## Nota importante

No pude validar el build dentro de este entorno porque los zips no incluyen `node_modules` completos. Los cambios están preparados por rutas reales del proyecto.
