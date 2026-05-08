# Fase 10 — UI para checks avanzados

Esta fase conecta visualmente los checks avanzados que ya existen en backend.

## Archivos incluidos

- `apps/web/src/modules/monitors/CreateMonitorPage.tsx`
- `apps/web/src/modules/monitors/MonitorEditModal.tsx`
- `apps/web/src/modules/monitors/MonitorDetailPage.tsx`

## Cambios visibles

### Crear monitor

Ahora puedes crear desde la web:

- HTTP(s)
- HTTP
- SSL
- TCP / Puerto
- DNS

El formulario cambia dinámicamente según el tipo:

- HTTP/HTTPS: código esperado + keyword opcional.
- TCP: puerto.
- SSL: días mínimos antes de caducidad.
- DNS: tipo de registro + valor esperado opcional.

### Editar monitor

El modal de edición también permite modificar:

- tipo de monitor,
- puerto TCP,
- keyword,
- aviso SSL,
- registro DNS,
- valor DNS esperado.

### Detalle de monitor

La pantalla de detalle muestra la configuración avanzada según el tipo de monitor.

## Comandos

Desde `apps/web`:

```bash
npm install
npm run build
npm run dev
```

## Nota

Esta fase no requiere migración Prisma si ya aplicaste correctamente la Fase 9.
