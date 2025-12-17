# Tasas de dólar en Venezuela
![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)

Monorepo con:
- `api/`: API (Express + TypeScript)
- `app/`: App web (Vite + React + TypeScript)

## Requisitos
- Node.js 18+ (recomendado 20+)

## Ejecutar en desarrollo
Desde la raíz:

```bash
npm install
npm run dev
```

- App: http://localhost:5173 (o el puerto que muestre Vite en la consola)
- API: http://localhost:3001
- Endpoint: http://localhost:3001/api/rates/today

Nota: si el puerto `5173` está ocupado, Vite intentará `5174`, `5175`, etc. Abre la URL **Local** que imprime Vite.

## Editar tasas
Edita el archivo `api/data/rates.json`.

## Actualización automática
Por defecto la API sirve las tasas desde `api/data/rates.json`.

Si quieres que se actualicen automáticamente “cuando cambien”, puedes configurar una fuente remota (un JSON con el mismo formato) y la API hará polling en segundo plano.

Variables de entorno (opcional):
- `PORT` (default: `3001`)
- `REFRESH_INTERVAL_MS` (default: `60000`)
- `REMOTE_RATES_URL` (si se define, la API toma tasas desde ese URL)

Tip: puedes crear `api/.env` (hay un ejemplo en `api/.env.example`).

Nota (Windows): si corres `npm run dev` y luego intentas ejecutar otros comandos en la MISMA terminal, puede aparecer `¿Desea terminar el trabajo por lotes (S/N)?`. Responder `S`/`si` detiene los procesos (API/App). Para hacer pruebas (`Invoke-RestMethod`, etc.), usa otra terminal.

Tip (VS Code): también puedes usar **Terminal → Run Task…** y ejecutar `Dev: API + App` (o `Dev: API` / `Dev: App`) para correr los servers en una terminal dedicada.

Nota (BCV / certificados): en algunas redes/PCs (antivirus/proxy con inspección TLS), Node puede fallar al consultar `https://www.bcv.org.ve/` con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Por eso el dev server de la API corre con `NODE_OPTIONS=--use-system-ca` para usar los certificados del sistema.

## Producción (GitHub Pages)
GitHub Pages es hosting estático (no corre Node/Express). Para que igual veas las tasas en producción, el repo genera un archivo estático:
- `app/public/rates-today.json`

La app en producción lee ese archivo (`./rates-today.json`). En este repo hay un workflow programado que lo actualiza periódicamente y hace commit.

Pasos (resumen):
- En GitHub: habilita Pages para el repo (Source: GitHub Actions).
- Asegúrate de que tu rama por defecto se llame `main` (o ajusta el workflow de Pages).

Generación manual del JSON (local):
```bash
npm --workspace api run generate:static
```

## Android (APK) con Capacitor
La app está preparada para empaquetarse como APK usando Capacitor.

Primera vez (crea el proyecto Android):
```bash
npm install
npm --workspace app run android:add
```

Cada vez que cambies la app (sync + build):
```bash
npm --workspace app run android:sync
```

Abrir en Android Studio:
```bash
npm --workspace app run android:open
```

Nota: cambia `appId`/`appName` en `app/capacitor.config.ts` a tus valores.

### Fuentes “en vivo”
Por defecto el proyecto está configurado para mostrar: **BCV, Binance P2P y Bybit P2P**.

Controla cuáles fuentes exponer con:
- `SOURCES` (default: `bcv,binance,bybit`)

Tip de diagnóstico: si una fuente no se está actualizando, revisa `meta.sources` en la respuesta de `GET /api/rates/today` (ahí verás `ok: true/false` y el `error` cuando falle una consulta).


