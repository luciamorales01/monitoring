# Notifications worker

Worker BullMQ que consume la cola `notifications` y envia emails con Nodemailer.

## Casos

- Monitor DOWN.
- Monitor recuperado.
- Recuperacion de contrasena.

La API solo encola jobs. Si SMTP no esta configurado, el worker escribe el email en logs, marca la notificacion como `SKIPPED` cuando aplica y no falla el job.

## Variables

```env
DATABASE_URL=postgresql://monitoring:monitoring@localhost:5432/monitoring
REDIS_HOST=localhost
REDIS_PORT=6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
NOTIFICATIONS_FROM=
FRONTEND_URL=http://localhost:5173
```

## Comandos

```bash
npm install
npm run build
npm start
```
