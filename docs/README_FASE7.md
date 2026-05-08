# Fase 7 — Secciones reales en backend

Esta fase convierte las secciones/departamentos en datos reales de base de datos. Ya no dependen solo de `localStorage`.

## Incluye

- Modelo `Section`.
- Relación many-to-many `SectionMonitor`.
- Endpoints protegidos:
  - `GET /sections`
  - `GET /sections/:id`
  - `POST /sections`
  - `PATCH /sections/:id`
  - `DELETE /sections/:id`
  - `POST /sections/:id/run-checks`
- Servicio para comprobar todos los monitores de una sección.
- API frontend base en `src/shared/sectionsApi.ts`.

## 1. Copiar archivos nuevos

Copia estos archivos en tu proyecto:

```txt
apps/api/src/modules/sections/*
apps/api/prisma/migrations/20260508090000_add_sections/migration.sql
apps/web/src/shared/sectionsApi.ts
```

## 2. Modificar `apps/api/prisma/schema.prisma`

Añade en `Organization`:

```prisma
sections  Section[]
```

Añade en `Monitor`:

```prisma
sections  SectionMonitor[]
```

Añade al final del archivo:

```prisma
model Section {
  id             Int              @id @default(autoincrement())
  name           String
  description    String           @default("")
  icon           String           @default("folder")
  organizationId Int
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  organization   Organization     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  monitors       SectionMonitor[]

  @@index([organizationId])
}

model SectionMonitor {
  sectionId  Int
  monitorId  Int
  assignedAt DateTime @default(now())

  section    Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  monitor    Monitor @relation(fields: [monitorId], references: [id], onDelete: Cascade)

  @@id([sectionId, monitorId])
  @@index([monitorId])
}
```

## 3. Modificar `apps/api/src/app.module.ts`

Añade el import:

```ts
import { SectionsModule } from './modules/sections/sections.module';
```

Y en `imports` añade:

```ts
SectionsModule,
```

## 4. Modificar `apps/api/src/modules/monitors/monitors.module.ts`

Deja el módulo así para que `SectionsService` pueda usar `MonitorsService`:

```ts
import { Module } from '@nestjs/common';
import { MonitorsController } from './monitors.controller';
import { MonitorSchedulerService } from './monitor-scheduler.service';
import { MonitorsService } from './monitors.service';

@Module({
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorSchedulerService],
  exports: [MonitorsService],
})
export class MonitorsModule {}
```

## 5. Comandos

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
npm run build
npm run start:dev
```

## 6. Comprobar en Swagger

En `/docs` deberías ver:

```txt
/api/sections
/api/sections/:id
/api/sections/:id/run-checks
```

## Nota

Esta fase deja el backend preparado. Si tu pantalla de secciones todavía usa `localStorage`, la siguiente mini-fase es conectar `SectionsPage.tsx` y `SectionDetailPage.tsx` a `sectionsApi.ts`.
