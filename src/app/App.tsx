import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router';

/**
 * Root route table of the storefront shell.
 *
 * Only the home route exists in this slice; catalog and checkout routes arrive
 * with their features and are lazy-loaded at this composition point.
 *
 * @returns The routed application shell.
 */
export function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomeShell />} />
    </Routes>
  );
}

/**
 * Temporary landing content that proves the Spanish shell renders.
 *
 * @returns The main landmark with the page heading.
 */
function HomeShell(): ReactElement {
  return (
    <main className="min-h-screen bg-stone-50 p-8 text-stone-900">
      <h1 className="text-3xl font-semibold">Tienda de baloncesto</h1>
      <p className="mt-4 max-w-prose">
        Demostración pública: el catálogo estará disponible en las próximas versiones.
      </p>
    </main>
  );
}
