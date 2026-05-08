# Fase 8 — Secciones conectadas al backend

Esta fase conecta la web de secciones con los endpoints reales añadidos en la Fase 7.

## Cambios

- `SectionsPage.tsx` deja de usar `localStorage`.
- Las secciones se cargan desde `GET /sections`.
- Crear sección usa `POST /sections`.
- Editar sección usa `PATCH /sections/:id`.
- Eliminar sección usa `DELETE /sections/:id`.
- `SectionDetailPage.tsx` carga una sección real desde `GET /sections/:id`.
- Botón `Comprobar todos` en el detalle de sección.
- Aviso previo antes de lanzar checks masivos.
- Un mismo monitor puede estar en varias secciones.

## Archivos incluidos

```txt
apps/web/src/modules/sections/SectionsPage.tsx
apps/web/src/modules/sections/SectionDetailPage.tsx
apps/web/src/shared/sectionsApi.ts
```

## Requisitos

Antes debe estar aplicada la Fase 7 en backend y debe existir `/api/sections`.

## Comandos

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

```bash
cd apps/web
npm run build
npm run dev
```
