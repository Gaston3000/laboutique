# PROMPT PARA COPILOT (Copiar y pegar esto)

Hola, necesito exportar mi base de datos PostgreSQL del proyecto "La Boutique de la Limpieza" para compartirla con mi compañero de equipo.

**Contexto:**
- Estoy trabajando en el proyecto laboutique (e-commerce)
- Tengo una base de datos PostgreSQL local con todos los productos e imágenes configuradas
- La base de datos se llama `la_boutique_db` o `laboutique` (por favor ayúdame a identificarla)
- He cargado aproximadamente 1,128 imágenes de productos y las asocié correctamente en la base de datos
- Mi compañero necesita un backup completo de mi base de datos porque él solo tiene 93 productos con imágenes configuradas

**Lo que necesito hacer:**

1. **Exportar un backup completo** de mi base de datos PostgreSQL usando el script que ya existe en el proyecto

2. El proyecto tiene un script npm: `npm run export:db:snapshot` que debería crear un archivo SQL de backup en `server/sql/backups/`

3. Una vez generado el archivo, necesito subirlo a GitHub para que mi compañero lo pueda descargar, con estos comandos:
   ```bash
   git add server/sql/backups/full_snapshot_*.sql
   git commit -m "feat: backup actualizado con todas las imágenes asociadas"
   git push origin main
   ```

**Pasos que necesito que me ayudes a ejecutar:**
1. Navegar a la carpeta del proyecto (server/)
2. Ejecutar el comando de exportación
3. Verificar que se creó el archivo de backup
4. Subirlo a GitHub

**Información adicional:**
- Estoy usando pgAdmin para gestionar PostgreSQL
- El proyecto está en Node.js con Express
- El servidor corre en el puerto 4000
- Las imágenes están en `server/uploads/products/`

¿Puedes ayudarme a ejecutar estos pasos de forma segura?
