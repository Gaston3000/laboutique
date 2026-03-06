# La Boutique de la Limpieza - Full Stack

Migración del sitio a:
- Frontend: React + Vite
- Backend: Node.js + Express
- Base de datos: PostgreSQL

## 1) Requisitos

- Node.js 20+ (incluye npm)
- PostgreSQL 15+

> En esta máquina actualmente `npm` no está disponible. Primero instalá Node.js: https://nodejs.org

## 2) Instalación

```bash
npm install
```

## 3) Variables de entorno

Copiar en Windows PowerShell:

```bash
Copy-Item server/.env.example server/.env
```

o en Mac/Linux:

```bash
cp server/.env.example server/.env
```

Editar `server/.env` con tus datos de PostgreSQL.

Agregar también una clave JWT:

```bash
JWT_SECRET=tu-clave-segura
```

Para habilitar checkout redirigido con Mercado Pago (Checkout Pro), agregar:

```bash
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_URL=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:4000
```

- `MERCADOPAGO_ACCESS_TOKEN`: credencial privada de tu cuenta Mercado Pago (producción o test).
- `CLIENT_URL`: URL del frontend (back_urls de éxito/error/pendiente).
- `PUBLIC_BASE_URL`: URL pública del backend para recibir webhooks.

## 4) Crear esquema de base de datos

Ejecutar `server/sql/schema.sql` en tu PostgreSQL.

Este script ahora también crea un usuario administrador por defecto:

- Email: `admin@laboutique.com`
- Contraseña: `Balto`

## 5) Ejecutar en desarrollo

Comando único (recomendado):

```bash
npm run dev
```

Alternativa en dos terminales:

```bash
npm run dev:server
npm run dev:client
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api

## 6) Nota sobre archivos legacy

La versión activa es `client/` + `server/`.
El `index.html` de la raíz ahora redirige automáticamente al frontend React (`http://localhost:5173`) para evitar abrir dos webs distintas.
