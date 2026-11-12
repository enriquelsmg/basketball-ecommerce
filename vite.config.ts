import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite build configuration for the storefront.
 *
 * Tailwind is wired through its first-party Vite plugin (CSS-first, no
 * PostCSS config), and React gets fast refresh in development.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
