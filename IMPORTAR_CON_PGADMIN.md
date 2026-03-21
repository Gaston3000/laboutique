# INSTRUCCIONES PARA IMPORTAR CON pgAdmin

El backup tiene problemas de dependencias de foreign keys. La forma más segura es usar pgAdmin:

## PASO 1: Abrir pgAdmin

1. Abre **pgAdmin** desde el menú inicio de Windows
2. Conéctate al servidor PostgreSQL (localhost)

## PASO 2: Abrir Query Tool

1. En el panel izquierdo, expande:
   - Servers → PostgreSQL 18 → Databases → la_boutique_db
2. Haz **clic derecho** en `la_boutique_db`
3. Selecciona **Query Tool**

## PASO 3: Abrir el archivo de backup

1. En Query Tool, ve a: **File → Open**
2. Navega a: `C:\Users\dylan\Documents\laboutique\server\sql\backups\`
3. Selecciona: `full_snapshot_20260321.sql`
4. Haz clic en **Open**

## PASO 4: Ejecutar el SQL

1. Presiona **F5** o haz clic en el botón ▶️ (Execute)
2. Espera a que termine (puede tardar 1-2 minutos)
3. Verás mensajes de error en los tickets, **eso es normal**
4. Los productos deberían haberse importado correctamente

## PASO 5: Verificar

1. Recarga tu navegador en http://localhost:5173
2. Presiona **Ctrl + F5** (recarga forzada)
3. Deberías ver las imágenes ahora

## Si no funciona:

Pídeme ayuda y veremos otra solución (como exportar solo la tabla de productos).
