# Tienda de baloncesto (demo)

Frontend de demostración para una tienda de material de baloncesto: camisetas, balones, redes, aros y equipamiento. Interfaz en español (`es-ES`), precios en euros, datos ficticios en memoria. No hay backend, cuentas, ni pagos reales.

## Requisitos

- Node.js 24 LTS (ver `.nvmrc`) y npm 11 o superior.

## Puesta en marcha

```bash
npm ci
```

`npm ci` instala exactamente las versiones del `package-lock.json` y activa los hooks de Git mediante Husky (`prepare`).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `http://127.0.0.1:5173`. |
| `npm run build` | Comprueba tipos de la aplicación y genera `dist/`. |
| `npm run preview` | Sirve `dist/` en `http://127.0.0.1:4173`. |
| `npm run lint` | ESLint (incluye SonarJS y reglas de arquitectura), sin avisos. |
| `npm run typecheck` | TypeScript estricto para aplicación, pruebas y herramientas. |
| `npm run test:unit` | Todas las pruebas (interfaz y salvaguardas de arquitectura). |
| `npm run test:core` | Solo las pruebas etiquetadas `core`. |
| `npm run test:coverage` | Todas las pruebas con puertas de cobertura por tier y reporte HTML en `coverage/`. |
| `npm run verify:commit` | Lint + build + pruebas core. Es lo que ejecuta el hook de pre-commit. |

Pendientes en fases posteriores: `test:e2e`, `contracts:*`, `security:dependencies`, `verify`, `release`.

## Hook de pre-commit

`.husky/pre-commit` ejecuta `npm run verify:commit` en cada commit. No usar `--no-verify`: si el hook falla, corrige la causa.

## Documentación

- [`docs/architecture.md`](docs/architecture.md): límites entre capas, reglas de dependencias y cobertura.
- [`CLAUDE.md`](CLAUDE.md): reglas de ingeniería del proyecto (fuente de verdad).
