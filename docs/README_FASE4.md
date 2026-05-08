# Fase 4 - Notificaciones reales por email

## Qué añade

- Envío de email cuando un monitor pasa a DOWN y se crea una incidencia.
- Envío de email cuando el monitor se recupera y la incidencia se resuelve automáticamente.
- Registro de notificaciones en base de datos (`NotificationEvent`).
- Endpoint `GET /notifications` para consultar las últimas notificaciones enviadas/omitidas/fallidas.
- Evita duplicados cuando una incidencia está `ACKNOWLEDGED`: se considera activa y no se crea otra incidencia nueva.
- Si SMTP no está configurado, no rompe los checks: guarda la notificación como `SKIPPED`.

## Variables nuevas en `.env`

```env
APP_NAME=Monitoring
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=password
SMTP_FROM="Monitoring <alerts@tudominio.com>"
```

Para probar en local sin enviar emails, puedes dejar las variables SMTP vacías. En ese caso verás eventos `SKIPPED` en `GET /notifications`.

## Comandos

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run build
npm run start:dev
```

## Cómo probar

1. Configura SMTP o deja SMTP vacío para comprobar el historial.
2. Crea un monitor con `alertEmail=true`.
3. Haz que falle varias veces hasta superar `alertThreshold`.
4. Comprueba que se crea una incidencia y aparece una notificación.
5. Recupera el monitor y comprueba que se genera una notificación de recuperación.

Los destinatarios son los usuarios `OWNER` y `ADMIN` activos de la organización.
