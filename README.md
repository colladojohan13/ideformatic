# Ideformatic

Web comercial de Johan Antonio Collado Martínez: desarrollo web, ecommerce y software para negocios.

## Arquitectura
- `docs/`: HTML, CSS, JavaScript y recursos publicados en GitHub Pages.
- `server/`: Cloudflare Worker, base D1, avisos por Resend y panel privado.
- `server/schema.sql`: esquema inicial; aplicar una sola vez en una base nueva.
- `tests/integration.mjs`: pruebas de almacenamiento, límites, CORS, sesiones y protección de cambios.

## Desarrollo
Requiere Node.js 22 o superior.

```sh
npm ci
npm run check
npm test
npx wrangler dev
```

El panel usa códigos de un solo uso enviados exclusivamente al correo del propietario. Los códigos caducan en diez minutos y permiten cinco intentos. Las sesiones duran ocho horas; los tokens se guardan como hashes.

## Configuración y despliegue
1. Iniciar sesión con `npx wrangler login`.
2. Crear D1 con `npx wrangler d1 create ideformatic-leads` y actualizar su ID en `wrangler.json`.
3. Inicializar con `npx wrangler d1 execute ideformatic-leads --remote --file server/schema.sql`.
4. Guardar `RESEND_API_KEY` y `LEAD_RATE_SALT` con `npx wrangler secret put NOMBRE`. Nunca subir claves, exportaciones privadas ni archivos de sesión a GitHub.
5. Ajustar `API_ORIGIN` en Wrangler y la dirección de API en `docs/config.js`.
6. Ejecutar `npm run deploy:api`.
7. Publicar la carpeta `docs/` con GitHub Pages.

La configuración usa Workers y D1 gratuitos; no configura actualizaciones a planes de pago. Sus cuotas gratuitas se aplican. El código guarda la consulta antes de intentar el aviso por correo y permite reintentar avisos desde el panel.

No se incluye una licencia de redistribución. Los datos de clientes y credenciales no forman parte del repositorio.


## Direcciones activas
- Web: https://colladojohan13.github.io/ideformatic/
- Panel: https://ideformatic-api.ideformatic.workers.dev/admin
- Entrada desde GitHub: https://colladojohan13.github.io/ideformatic/admin/
- Repositorio: https://github.com/colladojohan13/ideformatic

Migración validada el 26 de octubre de 2026: consulta enviada desde GitHub Pages, guardada en D1 y aviso enviado por Resend. El propietario confirmó acceso al panel mediante código por correo. El registro anterior era una prueba técnica y se conservó en D1. No se migraron claves ni sesiones de Sites.
