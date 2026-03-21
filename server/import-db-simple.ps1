# Script simplificado para importar backup
# Uso: .\import-db-simple.ps1

Write-Host "🔄 IMPORTANDO BACKUP DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

$backupFile = "sql\backups\full_snapshot_20260321.sql"

if (-not (Test-Path $backupFile)) {
    Write-Host "❌ No se encontró el archivo: $backupFile" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Archivo: $backupFile" -ForegroundColor Green
Write-Host ""

# Configuración
$dbUser = "postgres"
$dbPassword = "Melapody1520`$"  # ` escapa el $
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "la_boutique_db"

Write-Host "🔧 Configuración:" -ForegroundColor Cyan
Write-Host "   Usuario: $dbUser"
Write-Host "   Host: $dbHost"
Write-Host "   Base de datos: $dbName"
Write-Host ""

# Buscar psql
$psqlPaths = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe",
    "C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe"
)

$psqlPath = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        break
    }
}

if (-not $psqlPath) {
    $psqlPath = (Get-Command psql -ErrorAction SilentlyContinue).Source
}

if (-not $psqlPath) {
    Write-Host "❌ No se encontró psql.exe" -ForegroundColor Red
    Write-Host ""
    Write-Host "SOLUCIÓN: Usa pgAdmin" -ForegroundColor Yellow
    Write-Host "1. Abre pgAdmin" -ForegroundColor White
    Write-Host "2. Conecta a la base de datos '$dbName'" -ForegroundColor White
    Write-Host "3. Tools → Query Tool" -ForegroundColor White
    Write-Host "4. File → Open → $backupFile" -ForegroundColor White
    Write-Host "5. Presiona F5" -ForegroundColor White
    exit 1
}

Write-Host "✅ Encontrado psql: $psqlPath" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  ADVERTENCIA: Se reemplazarán los datos actuales" -ForegroundColor Yellow
$confirm = Read-Host "¿Continuar? (s/N)"

if ($confirm -ne 's' -and $confirm -ne 'S') {
    Write-Host "❌ Cancelado" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Importando..." -ForegroundColor Cyan

# Configurar contraseña
$env:PGPASSWORD = $dbPassword

try {
    # Ejecutar psql
    & $psqlPath -U $dbUser -h $dbHost -p $dbPort -d $dbName -f $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ ¡Éxito!" -ForegroundColor Green
        Write-Host "🔄 Recarga tu navegador con Ctrl+F5" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Error en la importación" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
