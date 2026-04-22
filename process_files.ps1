$targetFiles = @(
    'src/app/api/cajas/sesiones/route.ts',
    'src/app/api/contabilidad/movimientos/route.ts',
    'src/app/api/contabilidad/categorias/route.ts',
    'src/app/api/facturas/[id]/route.ts',
    'src/app/api/facturas/pagar/route.ts'
)

$results = @()

foreach ($filePath in $targetFiles) {
    if (-not (Test-Path $filePath)) {
        Write-Host " $filePath - NOT FOUND"
        $results += "$filePath|SKIPPED|N/A|0|Not found"
        continue
    }

    Write-Host "`n Processing: $filePath"
    
    $content = Get-Content $filePath -Raw
    
    # Check if file contains NextResponse.json
    $regex = [regex]::new('NextResponse\.json')
    $matches = $regex.Matches($content)
    $replacementCount = $matches.Count
    
    if ($replacementCount -eq 0) {
        Write-Host "  SKIP: No NextResponse.json found"
        $results += "$filePath|SKIPPED|N/A|0|No NextResponse.json"
        continue
    }
    
    Write-Host "  Found: $replacementCount occurrences of NextResponse.json"
    
    # Check if jsonResponse import already exists
    $hasImport = $content -match 'from.*@/lib/serializers'
    $importAdded = "NO"
    
    if (-not $hasImport) {
        $lines = @($content -split "`n")
        $lastImportIndex = -1
        
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match "^import\s+.*from\s+" -or $lines[$i] -match "^import\s+.*=\s+require") {
                $lastImportIndex = $i
            }
        }
        
        if ($lastImportIndex -ge 0) {
            $newImport = "import { jsonResponse } from '@/lib/serializers';"
            [System.Collections.ArrayList]$linesList = $lines
            $linesList.Insert($lastImportIndex + 1, $newImport)
            $content = $linesList -join "`n"
            $importAdded = "YES"
            Write-Host "  + Added import after line $($lastImportIndex + 1)"
        }
    } else {
        Write-Host "  ~ Import already exists"
        $importAdded = "EXISTING"
    }
    
    # Replace NextResponse.json with jsonResponse
    $newContent = $content -replace 'NextResponse\.json', 'jsonResponse'
    
    if ($newContent -ne $content) {
        Set-Content -Path $filePath -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "   SUCCESS: Replaced $replacementCount occurrences"
        $results += "$filePath|SUCCESS|$importAdded|$replacementCount|OK"
    } else {
        Write-Host "   FAILED: Replacement did not work"
        $results += "$filePath|FAILED|$importAdded|0|Replacement failed"
    }
}

Write-Host "`n`n=== REPORT ===" -ForegroundColor Green
Write-Host "File|Status|Import|Changes|Result"
$results | ForEach-Object { Write-Host $_ }
