import { defineConfig } from 'vite';

const CONTOURS = new Set(['beeline', 'megafon', 'yandex', 'crazygames']);

export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __SEABATTLE_CONTOUR__: JSON.stringify(CONTOURS.has(mode) ? mode : ''),
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
}));
