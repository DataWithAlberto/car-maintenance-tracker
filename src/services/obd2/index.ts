import { isTauri, type OBD2Transport } from './transport';
import { WebBluetoothTransport } from './webBluetoothTransport';
import { TauriBlecTransport } from './tauriBlecTransport';

export type { OBD2Transport } from './transport';
export { isTauri } from './transport';
export type { BLEProfile } from './profiles';
export { getKnownBLEProfiles } from './profiles';

/**
 * Construye la capa de transporte adecuada al entorno de ejecución:
 *  - App de escritorio Tauri (macOS) → BLE nativo vía `tauri-plugin-blec`.
 *  - Navegador web (Vercel)          → Web Bluetooth API.
 */
export function createTransport(): OBD2Transport {
  return isTauri() ? new TauriBlecTransport() : new WebBluetoothTransport();
}
