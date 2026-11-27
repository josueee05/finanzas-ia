# Publicar Finanzas IA

Guía para publicar la app gratis con **Vercel** (hosting) y **Neon** (PostgreSQL). Las dos cuentas se crean entrando con GitHub. Tiempo aproximado: 20 minutos.

## 1. Subir el código a GitHub

1. Entra a <https://github.com/new>, crea un repositorio llamado `finanzas-ia` (público, **sin** README ni .gitignore: ya existen).
2. En la terminal del proyecto:

   ```bash
   git checkout main            # o la rama principal
   git remote add origin https://github.com/<tu-usuario>/finanzas-ia.git
   git push -u origin main
   ```

3. En la pestaña **Actions** del repo debería aparecer el CI en verde ✅.

## 2. Base de datos en Neon

1. Entra a <https://neon.tech> con tu cuenta de GitHub y crea un proyecto (región cercana, p. ej. `US East`).
2. En **Connection Details**, activa **Pooled connection** y copia la URL. Se ve así:
   `postgresql://usuario:clave@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Aplica las migraciones desde tu computadora (solo la primera vez y cada vez que agregues una migración):

   ```bash
   # PowerShell
   $env:DATABASE_URL="postgresql://...pooler.../neondb?sslmode=require"; pnpm db:migrate
   ```

   Debe decir `✅ Migraciones aplicadas (DATABASE_URL)`.

## 3. Login con GitHub (OAuth App)

1. Ve a <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
2. Completa:
   - **Application name:** Finanzas IA
   - **Homepage URL:** la URL de Vercel (paso 4; puedes volver a editarla después)
   - **Authorization callback URL:** `https://<tu-app>.vercel.app/api/auth/github/callback`
3. Copia el **Client ID** y genera un **Client secret**.

> Para probar el login con GitHub en local, crea una segunda OAuth App con la callback `http://localhost:3000/api/auth/github/callback` y pon sus datos en `.env.local`.

## 4. Desplegar en Vercel

1. Entra a <https://vercel.com/new> con GitHub e importa el repo `finanzas-ia`. Vercel detecta Next.js solo.
2. En **Environment Variables** agrega:

   | Variable               | Valor                                                    |
   | ---------------------- | -------------------------------------------------------- |
   | `DATABASE_URL`         | La URL *pooled* de Neon                                   |
   | `AUTH_SECRET`          | Una clave aleatoria: `openssl rand -base64 32` (o cualquier texto aleatorio de 32+ caracteres) |
   | `GITHUB_CLIENT_ID`     | Del paso 3                                               |
   | `GITHUB_CLIENT_SECRET` | Del paso 3                                               |
   | `ANTHROPIC_API_KEY`    | Opcional. Sin ella, la demo funciona en modo demo        |

3. Pulsa **Deploy**. Al terminar, abre la URL y prueba **"Probar como invitado"**.
4. Si la URL final es distinta a la que pusiste en la OAuth App, actualiza ahí la *Homepage* y la *callback URL*.

## 5. Últimos toques para el portafolio

- Pon la URL de la demo en el README (línea "Demo") y en la sección **About** del repo.
- Agrega capturas del dashboard y del asistente en `docs/` y enlázalas en el README.
- Fija el repo en tu perfil de GitHub (**Customize your pins**).

## Problemas comunes

| Síntoma | Causa probable |
| --- | --- |
| Error 500 con "Falta AUTH_SECRET" | No agregaste `AUTH_SECRET` en Vercel, o tiene menos de 32 caracteres |
| `relation "users" does not exist` | Faltó correr `pnpm db:migrate` con la `DATABASE_URL` de Neon |
| GitHub dice "redirect_uri is not associated" | La callback URL de la OAuth App no coincide exactamente con la de Vercel |
| El asistente responde "modo demo" con API key | La key es inválida o no tiene crédito; revisa los logs de la función en Vercel |
