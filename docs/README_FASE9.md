# Fase 9 — Checks avanzados SSL, DNS, TCP y keyword

## Qué añade

- Nuevos tipos de monitor:
  - `SSL`: comprueba caducidad del certificado.
  - `TCP`: comprueba si un puerto está abierto.
  - `DNS`: comprueba registros DNS.
  - `HTTP/HTTPS` con keyword opcional.
- Nuevos campos opcionales en `Monitor`:
  - `tcpPort`
  - `keyword`
  - `sslWarningDays`
  - `dnsRecordType`
  - `dnsExpectedValue`
- Mantiene incidencias, alertas y checks automáticos ya existentes.

## Cómo aplicarlo

Copia el contenido de `api/` encima de `apps/api/`.

Después ejecuta:

```bash
cd apps/api
npx prisma migrate dev --name add_advanced_monitor_checks
npx prisma generate
npm run build
npm run start:dev
```

Copia `web/src/shared/monitorApi.ts` encima de `apps/web/src/shared/monitorApi.ts`.

Después:

```bash
cd apps/web
npm run build
npm run dev
```

## Importante

Esta fase deja el backend preparado. Si tu pantalla de crear monitor todavía solo muestra HTTP/HTTPS, puedes crear los nuevos monitores desde Swagger o con seed hasta que conectemos la UI completa en la siguiente fase.

## Ejemplos para crear desde Swagger

### SSL

```json
{
  "name": "SSL GitHub",
  "type": "SSL",
  "target": "github.com",
  "frequencySeconds": 3600,
  "timeoutSeconds": 10,
  "sslWarningDays": 30,
  "locations": ["madrid"],
  "alertEmail": true,
  "alertPush": false,
  "alertThreshold": 1
}
```

### TCP

```json
{
  "name": "TCP Google HTTPS",
  "type": "TCP",
  "target": "google.com",
  "tcpPort": 443,
  "frequencySeconds": 300,
  "timeoutSeconds": 5,
  "locations": ["madrid"],
  "alertEmail": true,
  "alertPush": false,
  "alertThreshold": 2
}
```

### DNS

```json
{
  "name": "DNS GitHub A",
  "type": "DNS",
  "target": "github.com",
  "dnsRecordType": "A",
  "frequencySeconds": 600,
  "timeoutSeconds": 10,
  "locations": ["madrid"],
  "alertEmail": true,
  "alertPush": false,
  "alertThreshold": 2
}
```

### HTTP keyword

```json
{
  "name": "Keyword Wikipedia",
  "type": "HTTPS",
  "target": "https://www.wikipedia.org",
  "expectedStatusCode": 200,
  "keyword": "Wikipedia",
  "frequencySeconds": 300,
  "timeoutSeconds": 10,
  "locations": ["madrid"],
  "alertEmail": true,
  "alertPush": false,
  "alertThreshold": 2
}
```

## Siguiente fase recomendada

Fase 10: adaptar visualmente la pantalla Crear/Editar Monitor para mostrar campos dinámicos según el tipo: HTTP, SSL, TCP o DNS.
