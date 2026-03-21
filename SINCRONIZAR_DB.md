# INSTRUCCIONES PARA SINCRONIZAR LA BASE DE DATOS

## 📤 PASO 1: Tu amigo debe exportar su base de datos

**Tu amigo debe ejecutar estos comandos en su PowerShell:**

```powershell
cd C:\ruta\de\su\proyecto\laboutique\server
npm run export:db:snapshot
```

Esto creará un archivo en `server/sql/backups/full_snapshot_[fecha].sql`

## 📁 PASO 2: Obtener el archivo

**Opción A - Mediante Git (Recomendado):**
Tu amigo debe:
```powershell
git add server/sql/backups/full_snapshot_*.sql
git commit -m "feat: actualizar backup de base de datos con todas las imágenes"
git push origin main
```

Luego tú ejecutas:
```powershell
git pull origin main
```

**Opción B - Enviarlo directamente:**
Tu amigo te envía el archivo `.sql` por WhatsApp/Email/Drive y lo guardas en:
`C:\Users\dylan\Documents\laboutique\server\sql\backups\`

## 📥 PASO 3: Importar la base de datos en tu máquina

**Una vez que tengas el archivo, ejecuta en PowerShell:**

```powershell
cd C:\Users\dylan\Documents\laboutique\server

# Nombre del archivo que te envió tu amigo (ajusta la fecha)
$backupFile = "sql\backups\full_snapshot_20260321.sql"

# Importar la base de datos
$env:PGPASSWORD="Melapody1520$"
psql -U postgres -d la_boutique_db -f $backupFile
```

## ✅ PASO 4: Verificar

Recarga tu navegador (Ctrl+F5) y deberías ver todas las imágenes.

---

## 🔧 Troubleshooting

Si psql no está disponible, instálalo:
1. Abre pgAdmin
2. Ve a File → Preferences → Binary paths
3. Agrega la ruta de PostgreSQL bin (ej: C:\Program Files\PostgreSQL\16\bin)
4. Agrega esa ruta al PATH del sistema

O usa pgAdmin para importar:
1. Abre pgAdmin
2. Selecciona la base de datos `la_boutique_db`
3. Tools → Query Tool
4. File → Open → Selecciona el archivo .sql
5. Ejecuta (F5)
