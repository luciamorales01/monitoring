# Monitoring Frontend

Aplicacion React + TypeScript + Vite del proyecto Monitoring TFG.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Variables de entorno

Crear `frontend/.env` con:

```env
VITE_APP_NAME=Monitoring
VITE_API_URL=http://localhost:3000/api
VITE_REQUEST_TIMEOUT_MS=10000
```

## Notas

- La aplicacion vive directamente en `frontend/`.
- `vite.config.ts` usa `envDir: '..'`, asi que tambien puede leer variables del raiz si existen.
- El build de produccion genera `dist/` y el `Dockerfile` lo sirve con Nginx.
