
# scripts/sync-to-cloud.ps1
# Sincroniza la base de datos local a Neon (Nube)

$LocalUrl = "postgresql://postgres:Axm0227*@127.0.0.1:5432/sistema_v3?sslmode=disable"
$CloudUrl = "postgresql://neondb_owner:npg_KC1FGXmnIbw7@ep-withered-term-ah5smbej-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
$DumpFile = "local_dump_temp.sql"
$PgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

Write-Host "--- Iniciando Sincronización Local -> Neon ---" -ForegroundColor Cyan

# 1. Volcar base de datos local
Write-Host "1. Volcando base de datos local..." -ForegroundColor Yellow
& $PgDumpPath --dbname=$LocalUrl --file=$DumpFile --no-owner --no-privileges --clean --if-exists --format=plain

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al volcar la base de datos local." -ForegroundColor Red
    exit 1
}

# 2. Restaurar en Neon
Write-Host "2. Restaurando en Neon (Nube)..." -ForegroundColor Yellow
$Env:PGPASSWORD = "Axm0227*"
& $PsqlPath --dbname=$CloudUrl --file=$DumpFile

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al restaurar en Neon." -ForegroundColor Red
    exit 1
}

# 3. Limpieza
Write-Host "3. Limpiando archivos temporales..." -ForegroundColor Yellow
Remove-Item $DumpFile

Write-Host "--- Sincronización Completada con Éxito ---" -ForegroundColor Green
