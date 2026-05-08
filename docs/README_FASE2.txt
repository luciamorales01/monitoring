FASE 2 - Conexión real Dashboard + Informes

Copia las carpetas `api` y `web` encima de tus carpetas actuales respetando rutas.

Backend añadido/corregido:
- GET /dashboard/summary
- GET /reports/summary?range=24h|7d|30d

Frontend añadido/corregido:
- src/shared/dashboardApi.ts
- src/shared/reportsApi.ts
- DashboardPage usa KPIs reales del backend cuando están disponibles.
- ReportsPage usa datos reales del backend y exporta CSV con esos datos.

Comandos recomendados después de copiar:

Backend:
cd api
npm install
npx prisma generate
npm run build
npm run start:dev

Frontend:
cd web
npm install
npm run build
npm run dev

Nota: en este entorno no se ha podido validar el build porque los zips no incluyen node_modules completos ni .bin/@types. El código está preparado para compilar en tu proyecto tras npm install.
