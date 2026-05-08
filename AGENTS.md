# AGENTS.md

Proyecto Monitoring: monorepo con `apps/api` NestJS + Prisma y `apps/web` React + Vite + TypeScript.

Reglas:
- No reescribir pantallas completas si basta con cambios pequeños.
- Mantener estilos existentes y reutilizar helpers/componentes ya creados.
- No tocar migraciones ni schema salvo que se pida.
- Proteger permisos también en frontend, no solo backend.
- Ejecutar build al final si es posible.

Roles:
- OWNER y ADMIN pueden crear/editar/eliminar/ejecutar acciones.
- VIEWER solo puede leer/ver/exportar.
- VIEWER no debe ver botones ni controles de escritura.

Frontend:
- Detectar rol desde el usuario autenticado/contexto/store existente.
- Crear helper reutilizable si no existe: `canWrite = role === "OWNER" || role === "ADMIN"`.
- Ocultar acciones para VIEWER en:
  - Dashboard
  - MonitorsPage
  - MonitorDetailPage
  - IncidentsPage
  - IncidentDetailPage
  - SectionsPage
  - SectionDetailPage
  - UsersPage
  - SettingsPage
- Acciones a ocultar:
  - crear
  - editar
  - eliminar
  - pausar/activar
  - comprobar ahora
  - comprobar todos
  - resolver incidencia
  - reconocer incidencia
  - cambiar severidad
  - invitar usuario
  - cambiar rol/estado
- No basta con `disabled`; preferir no renderizar el botón.
- Mantener visible toda la información de lectura.

Backend:
- No modificar ahora salvo errores evidentes.