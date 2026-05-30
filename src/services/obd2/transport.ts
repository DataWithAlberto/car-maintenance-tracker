import type { BLEProfile } from './profiles';

/**
 * Abstracción de la capa física de transporte hacia el adaptador OBD-II.
 *
 * Toda la lógica ELM327 (init AT, PIDs, parsing, polling) vive en
 * `obd2.service.ts` y solo depende de esta interfaz, de modo que la misma
 * lógica de protocolo funciona tanto sobre Web Bluetooth (navegador / build
 * web en Vercel) como sobre BLE nativo (app de escritorio Tauri en macOS, vía
 * `tauri-plugin-blec`).
 */
export interface OBD2Transport {
  /** ¿La plataforma actual ofrece acceso a BLE? */
  readonly isSupported: boolean;
  /** ¿Hay un enlace GATT activo con notificaciones suscritas? */
  readonly isConnected: boolean;
  /** Nombre legible del dispositivo conectado (o un placeholder). */
  readonly deviceName: string;
  /** Perfil BLE que casó en la última conexión exitosa (diagnóstico). */
  readonly matchedProfile: BLEProfile | null;
  /** Heurística: ¿el dispositivo es probablemente un OBDLink MX+/LX? */
  readonly isOBDLinkDevice: boolean;

  /** Registra el handler que recibe cada chunk de bytes entrante (notificación). */
  onData(cb: (chunk: Uint8Array) => void): void;
  /** Registra el handler invocado cuando el enlace cae de forma inesperada. */
  onDisconnect(cb: () => void): void;

  /**
   * Conexión interactiva (primer uso). En Web Bluetooth muestra el selector
   * del navegador; en Tauri escanea y selecciona el adaptador OBD-II.
   * Al resolver, el dispositivo está conectado y las notificaciones suscritas
   * (pero SIN inicializar el ELM327 — de eso se encarga el servicio).
   */
  connect(): Promise<void>;
  /** Reconexión silenciosa al último dispositivo permitido. Devuelve el nombre o null. */
  tryAutoConnect(): Promise<string | null>;
  /** Nombres de dispositivos previamente permitidos (para mostrar pista de reconexión). */
  getPreviousDevices(): Promise<string[]>;
  /** Cierra el enlace y libera recursos. */
  disconnect(): Promise<void>;
  /** Envía bytes crudos al characteristic de escritura. */
  write(bytes: Uint8Array): Promise<void>;
}

/** ¿Corre la app dentro del runtime nativo de Tauri (WebView nativo)? */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}
