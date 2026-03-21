# Script para importar backup de base de datos
# Uso: .\import-backup.ps1 -BackupFile "sql\backups\full_snapshot_20260321.sql"

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupFile
)

Write-Host "🔄 IMPORTADOR DE BACKUP DE BASE DE DATOS" -ForegroundColor Cyan
Write-Host "=" * 60

# Si no se especificó archivo, buscar el más reciente
if (-not $BackupFile) {
    $backups = Get-ChildItem "sql\backups\full_snapshot_*.sql" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    
    if ($backups.Count -eq 0) {
        Write-Host "❌ No se encontraron archivos de backup en sql\backups\" -ForegroundColor Red
        Write-Host ""
        Write-Host "Por favor, pídele a tu amigo que ejecute:" -ForegroundColor Yellow
        Write-Host "  npm run export:db:snapshot" -ForegroundColor White
        Write-Host ""
        Write-Host "Y luego te envíe el archivo generado o lo suba a Git." -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "Backups disponibles:" -ForegroundColor Green
    for ($i = 0; $i -lt $backups.Count; $i++) {
        $file = $backups[$i]
        Write-Host "  [$i] $($file.Name) - $($file.LastWriteTime)" -ForegroundColor White
    }
    
    Write-Host ""
    $selection = Read-Host "Selecciona el número del backup a importar (0-$($backups.Count - 1)) o ENTER para el más reciente"
    
    if ([string]::IsNullOrWhiteSpace($selection)) {
        $selection = 0
    }
    
    $BackupFile = $backups[[int]$selection].FullName
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "❌ El archivo no existe: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📁 Archivo a importar: $BackupFile" -ForegroundColor Green
Write-Host ""

# Leer configuración de .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match 'DATABASE_URL=postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
        $dbUser = $matches[1]
        $dbPassword = $matches[2]
        $dbHost = $matches[3]
        $dbPort = $matches[4]
        $dbName = $matches[5]
        
        Write-Host "🔧 Configuración detectada:" -ForegroundColor Cyan
        Write-Host "   Usuario: $dbUser"
        Write-Host "   Host: $dbHost"
        Write-Host "   Puerto: $dbPort"
        Write-Host "   Base de datos: $dbName"
        Write-Host ""
    } else {
        Write-Host "❌ No se pudo leer DATABASE_URL del archivo .env" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ No se encontró el archivo .env" -ForegroundColor Red
    exit 1
}

# Verificar si psql está disponible
$psqlPath = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psqlPath) {
    Write-Host "⚠️  psql no está en el PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Buscando psql en ubicaciones comunes..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe",
        "C:\Program Files\PostgreSQL\14\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $psqlPath = $path
            Write-Host "✅ Encontrado: $psqlPath" -ForegroundColor Green
            break
        }
    }
    
    if (-not $psqlPath) {
        Write-Host ""
        Write-Host "❌ No se encontró psql.exe" -ForegroundColor Red
        Write-Host ""
        Write-Host "SOLUCIÓN ALTERNATIVA - Usar pgAdmin:" -ForegroundColor Yellow
        Write-Host "1. Abre pgAdmin" -ForegroundColor White
        Write-Host "2. Conecta a la base de datos '$dbName'" -ForegroundColor White
        Write-Host "3. Haz clic derecho → Query Tool" -ForegroundColor White
        Write-Host "4. File → Open → Selecciona: $BackupFile" -ForegroundColor White
        Write-Host "5. Presiona F5 para ejecutar" -ForegroundColor White
        exit 1
    }
}

Write-Host ""
Write-Host "⚠️  ADVERTENCIA: Esto reemplazará todos los datos actuales" -ForegroundColor Yellow
$confirm = Read-Host "¿Continuar? (s/N)"

if ($confirm -ne 's' -and $confirm -ne 'S') {
    Write-Host "❌ Importación cancelada" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🚀 Importando backup..." -ForegroundColor Cyan

# Decodificar la contraseña (remover %24 = $)
$dollarSign = [char]36
$decodedPassword = $dbPassword -replace '%24', $dollarSign

# Configurar variable de entorno para la contraseña
$env:PGPASSWORD = $decodedPassword

try {
    # Ejecutar psql
    & $psqlPath -U $dbUser -h $dbHost -p $dbPort -d $dbName -f $BackupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ ¡Backup importado exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔄 Ahora recarga tu navegador con Ctrl+F5" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "❌ Hubo errores durante la importación" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
} finally {
    # Limpiar la variable de entorno
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
