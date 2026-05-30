import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Puerto dedicado y estricto para que la app de escritorio Tauri (devUrl)
  // siempre encuentre el dev server en la misma URL. strictPort hace que falle
  // de forma ruidosa si está ocupado, en vez de saltar a otro puerto y que la
  // ventana nativa cargue contenido equivocado.
  server: {
    port: 1420,
    strictPort: true,
  },
  // Evita que Vite limpie la pantalla y oculte los logs del compilador de Rust.
  clearScreen: false,
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
