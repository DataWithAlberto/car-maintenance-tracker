// ─── Known ELM327 / STN BLE profiles ───────────────────────────────────────────
// Listado en orden de prioridad: primero los perfiles "premium" (OBDLink),
// después los genéricos. Las capas de transporte los prueban en secuencia.
export interface BLEProfile {
  /** Nombre legible para logs y depuración. */
  name: string;
  serviceUUID: string;
  writeUUID: string;
  notifyUUID: string;
}

export const BLE_PROFILES: BLEProfile[] = [
  {
    // OBDLink MX+ / LX / CX (chipset STN2120 con módulo BLE Microchip RN4870/71).
    // Servicio "Microchip Transparent UART" — el mismo que usan todas las
    // herramientas oficiales de OBDLink Suite, OBDLink app y BlueDriver.
    name: 'OBDLink (Microchip BLE)',
    serviceUUID: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    writeUUID: '49535343-8841-43f4-a8d4-ecbe34729bb3',
    notifyUUID: '49535343-1e4d-4bd9-ba61-23c647249616',
  },
  {
    // Nordic UART Service (adaptadores BLE genéricos basados en nRF).
    name: 'Nordic UART',
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    writeUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notifyUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  },
  {
    // ELM327 chinos baratos basados en SPP-over-BLE (Vgate iCar Pro, Veepeak…).
    name: 'ELM327 generic (FFF0)',
    serviceUUID: '0000fff0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000fff2-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000fff1-0000-1000-8000-00805f9b34fb',
  },
  {
    // BTLE-miniOBD / TI CC254x clones (servicio FFE0, único char read/write).
    name: 'TI CC254x / miniOBD (FFE0)',
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  },
];

/** Solo lectura, útil para UI/diagnóstico. */
export const getKnownBLEProfiles = (): ReadonlyArray<BLEProfile> => BLE_PROFILES;

/** ¿El nombre del dispositivo sugiere un adaptador OBD-II conocido? */
export function looksLikeObdName(name: string | null | undefined): boolean {
  const n = (name ?? '').toLowerCase();
  return /obdlink|obd-?ii|obd2|elm327|vlink|vgate|veepeak|stn\d|konnwei|panlong|carista/.test(n);
}
