# Backup Webhook Worker

Worker HTTP minimal para ejecutar `pg_dump` fuera de Vercel y permitir backups desde el dashboard.

## 1) Requisitos

- Node.js 18+
- PostgreSQL client (`pg_dump`) instalado en el host
- Acceso de red a tu base de datos

## 2) Variables de entorno del worker

```env
PORT=8787
BACKUP_OUTPUT_DIR=./worker-backups
BACKUP_WEBHOOK_TOKEN=un-token-seguro

# Opcional: si no envías databaseUrl en el payload
BACKUP_DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Opcional: ruta explícita al binario
# PG_DUMP_PATH=/usr/bin/pg_dump
# o carpeta del binario
# POSTGRES_BIN_PATH=/usr/lib/postgresql/16/bin
```

## 3) Ejecutar local / servidor

```bash
npm run backup:worker
```

Endpoints:

- `GET /health`
- `POST /api/backup`

### Ejemplo de request

```bash
curl -X POST http://localhost:8787/api/backup \
  -H "Authorization: Bearer un-token-seguro" \
  -H "Content-Type: application/json" \
  -d '{"databaseUrl":"postgresql://user:pass@host/db?sslmode=require"}'
```

## 4) Configuración en Vercel (tu app Next.js)

En tu proyecto de Vercel define:

```env
BACKUP_WEBHOOK_URL=https://tu-worker.com/api/backup
BACKUP_WEBHOOK_TOKEN=un-token-seguro
```

Con esto, el botón de backup del dashboard delega la operación al worker.

## 5) Recomendación de producción

- Guardar backups en storage persistente (S3/R2/GCS) en lugar de disco local.
- Rotar y expirar backups viejos (retención, por ejemplo 7/30/90 días).
- Restringir IPs o proteger el endpoint detrás de red privada/VPN si es posible.
