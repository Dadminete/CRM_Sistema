$ErrorActionPreference = "Stop"

$projectRef = "hokmyvmbogqtnpsjidav"
$poolerInput = (Read-Host "Pega el host o la cadena de conexión copiada de Supabase > Connect").Trim()
$poolerMatch = [Regex]::Match(
    $poolerInput,
    "^(?:postgres(?:ql)?://(?<user>[^:@/]+)(?::[^@]*)?@)?(?<host>[a-z0-9.-]+\.pooler\.supabase\.com)(?::(?<port>\d+))?(?:/postgres(?:\?.*)?)?$",
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)
if (-not $poolerMatch.Success) {
    throw "Formato no válido. Pega el host o la cadena PostgreSQL de Connect."
}

$poolerHost = $poolerMatch.Groups["host"].Value
$poolerPort = $poolerMatch.Groups["port"].Value
$poolerUser = $poolerMatch.Groups["user"].Value

if ($poolerUser -and $poolerUser -ne "postgres.$projectRef") {
    throw "La cadena de Connect no parece pertenecer al proyecto Supabase configurado."
}
if ($poolerPort -and $poolerPort -notin @("5432", "6543")) {
    throw "El puerto debe ser 5432 (sesión) o 6543 (transacciones)."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$caPath = Join-Path $repoRoot "certs\supabase-prod-ca-2021.crt"

if (-not (Test-Path -LiteralPath $envPath)) {
    throw "No se encontró .env. Ejecuta este script desde el repositorio."
}

if (-not (Test-Path -LiteralPath $caPath)) {
    throw "Descarga el certificado CA de producción desde Supabase > Database > Settings > SSL Configuration y guárdalo como certs\supabase-prod-ca-2021.crt."
}

$securePassword = Read-Host "Escribe la contraseña de la base de datos de Supabase" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ([string]::IsNullOrWhiteSpace($password)) {
        throw "La contraseña de la base de datos no puede estar vacía."
    }

    $encodedPassword = [Uri]::EscapeDataString($password)
    $sslOptions = "sslmode=verify-full&sslrootcert=certs%2Fsupabase-prod-ca-2021.crt"
    $appUrl = "postgresql://postgres.${projectRef}:$encodedPassword@${poolerHost}:6543/postgres?$sslOptions"
    $backupUrl = "postgresql://postgres.${projectRef}:$encodedPassword@${poolerHost}:5432/postgres?$sslOptions"

    $env:SUPABASE_TEST_APP_URL = $appUrl
    $env:SUPABASE_TEST_BACKUP_URL = $backupUrl
    & node (Join-Path $PSScriptRoot "test-supabase-connections.mjs")
    if ($LASTEXITCODE -ne 0) {
        throw "Falló la prueba de conexión. No se modificó .env. Comprueba los datos en Supabase > Connect y la contraseña de Database."
    }
}
finally {
    Remove-Item Env:\SUPABASE_TEST_APP_URL -ErrorAction SilentlyContinue
    Remove-Item Env:\SUPABASE_TEST_BACKUP_URL -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $password = $null
    $encodedPassword = $null
}

$lines = [System.IO.File]::ReadAllLines($envPath)
$updates = @{
    "DATABASE_URL" = $appUrl
    "CLOUD_DATABASE_URL" = $appUrl
    "BACKUP_DATABASE_URL" = $backupUrl
}

foreach ($key in $updates.Keys) {
    $matchingLines = @($lines | Where-Object { $_ -match "^\s*$([Regex]::Escape($key))\s*=" })
    if ($matchingLines.Count -ne 1) {
        throw "Se esperaba exactamente una entrada $key en .env; se encontraron $($matchingLines.Count)."
    }
}

foreach ($key in $updates.Keys) {
    $pattern = "^\s*$([Regex]::Escape($key))\s*=.*$"
    $replacement = "$key=$($updates[$key])"
    $lines = @($lines | ForEach-Object {
        if ($_ -match $pattern) { $replacement } else { $_ }
    })
}

$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($envPath, $lines, $utf8WithoutBom)

Write-Host "DATABASE_URL y CLOUD_DATABASE_URL apuntan al pooler de transacciones de Supabase."
Write-Host "BACKUP_DATABASE_URL apunta al pooler de sesión de Supabase para IPv4."
Write-Host "No se mostraron las cadenas de conexión ni la contraseña."
