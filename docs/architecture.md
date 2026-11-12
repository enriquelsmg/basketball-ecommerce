# Arquitectura

Este documento describe las reglas que el código aplica hoy. La fuente de verdad es [`CLAUDE.md`](../CLAUDE.md) §3; aquí se documenta cómo se verifican.

## Capas y dependencias

```
src/app/        composición: rutas, proveedores, arranque
src/features/   una carpeta por funcionalidad (catálogo, carrito, pagos simulados)
src/shared/     responsabilidades reutilizadas entre funcionalidades
```

Reglas (aplicadas por `tools/guardrails/architecture-rules.ts`):

| Regla | Motivo |
| --- | --- |
| `shared/` no importa de `features/` ni de `app/`. | Lo compartido no puede depender de quien lo consume. |
| `features/` no importa de `app/`. | La aplicación conecta las funcionalidades; no al revés. |
| Una funcionalidad no importa otra funcionalidad. | Evita acoplamiento entre módulos de negocio. Lo común se mueve a `shared/`. |
| Una página no importa otra página de la misma funcionalidad. | Lo compartido entre páginas vive en `features/<f>/shared/`. |

`app/` puede importar páginas y funcionalidades porque es el punto de composición.

## Dominio sin React

`src/shared/commerce/` y `src/features/*/domain/` no pueden importar `react`, `react-dom` ni `react-router`. La regla está en `tools/guardrails/domain-purity.ts` y se aplica con ESLint. Así las reglas de precio y stock se prueban sin DOM.

## Cómo se verifica

- **Ciclos de importación**: el grafo de importaciones relativas se recorre con Tarjan. Cualquier ciclo, incluida una autoimportación, falla la prueba `tests/guardrails/import-graph.test.ts`.
- **Clasificación de cobertura**: `config/coverage-policy.ts` asigna cada archivo de producción a un tier. Una prueba falla si aparece un archivo sin clasificar o una exclusión sin justificación.
- **Puertas por tier** (Vitest, por archivo): Core 100 %, Important 80 %, Supporting 60 % en líneas, funciones, ramas y sentencias.
- **Hook de pre-commit**: `verify:commit` se ejecuta en cada commit.

## Carga diferida

Pendiente de implementar. Las páginas de producto, carrito y confirmación se cargarán con `lazy` en el punto de composición de `src/app/` cuando existan.
