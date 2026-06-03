// Registra los matchers de jest-dom (toBeInTheDocument, etc.) en `expect`
// de Vitest. Se carga antes de cada archivo de test (ver vite.config.ts).
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Desmonta el árbol de React tras cada test para que el DOM no se acumule
// entre casos (Vitest no limpia automáticamente como sí hace Jest+RTL).
afterEach(() => cleanup());
