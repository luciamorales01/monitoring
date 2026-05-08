# Fase 11 — Informes PRO

## Cambios incluidos

### Backend

- `GET /reports/summary` mantiene el informe base, ahora con campos extra:
  - SLA.
  - downtime estimado.
  - checks caídos.
  - tipo de monitor.
- `GET /reports/export?range=24h|7d|30d&format=pdf|xlsx`.
- Exportación PDF básica descargable.
- Exportación Excel profesional con dos hojas:
  - Resumen.
  - Monitores.

### Frontend

- Botón `Exportar PDF`.
- Botón `Exportar Excel`.
- Se mantiene `Exportar CSV`.
- Nueva métrica visual de downtime estimado.
- Nueva columna SLA en la tabla.

## Comandos

```bash
cd apps/api
npm install
npm run build
npm run start:dev
```

```bash
cd apps/web
npm install
npm run build
npm run dev
```

## Notas

- No requiere migración Prisma.
- Usa `exceljs`, que ya existe en tu `package.json`.
- El PDF es intencionadamente simple para evitar dependencias adicionales y que compile de forma estable.
