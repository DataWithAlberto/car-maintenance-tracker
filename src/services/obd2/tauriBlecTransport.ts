import {
  startScan,
  stopScan,
  connect as blecConnect,
  disconnect as blecDisconnect,
  send as blecSend,
  subscribe as blecSubscribe,
  unsubscribe as blecUnsubscribe,
  listServices,
  checkPermissions,
  type BleDevice,
  type BleService,
} from '@mnlphlp/plugin-blec';
import { BLE_PROFILES, looksLikeObdName, type BLEProfile } from './profiles';
import type { OBD2Transport } from './transport';

const LS_LAST_ADDRESS = 'obd2:lastAddress';
const LS_LAST_NAME = 'obd2:lastName';
const SCAN_TIMEOUT_MS = 6000;

const norm = (uuid: string) => uuid.toLowerCase().trim();

/** Encuentra el perfil cuyo servicio + characteristics existen en el dispositivo. */
function matchProfile(services: BleService[]): BLEProfile | null {
  const byUuid = new Map(services.map((s) => [norm(s.uuid), s]));
  for (const profile of BLE_PROFILES) {
    const svc = byUuid.get(norm(profile.serviceUUID));
    if (!svc) continue;
    const chars = new Set(svc.characteristics.map((c) => norm(c.uuid)));
    if (chars.has(norm(profile.writeUUID)) && chars.has(norm(profile.notifyUUID))) {
      return profile;
    }
  }
  return null;
}

/** Selecciona el mejor candidato OBD-II de una lista escaneada. */
function pickObdDevice(devices: BleDevice[]): BleDevice | null {
  const profileServices = new Set(BLE_PROFILES.map((p) => norm(p.serviceUUID)));
  // 1) El que anuncia un servicio conocido (máxima certeza).
  const byService = devices.find((d) =>
    (d.services ?? []).some((s) => profileServices.has(norm(s))),
  );
  if (byService) return byService;
  // 2) El que tiene pinta de adaptador OBD por el nombre.
  const byName = devices.find((d) => looksLikeObdName(d.name));
  return byName ?? null;
}

/**
 * Transporte BLE nativo para la app de escritorio Tauri (macOS).
 *
 * Usa `tauri-plugin-blec` (sobre `btleplug`) porque WKWebView —el WebView que
 * Tauri usa en macOS— NO implementa la Web Bluetooth API. Reproduce la misma
 * superficie que `WebBluetoothTransport`: escanea, selecciona el adaptador,
 * sondea el perfil GATT y entrega los bytes crudos al servicio OBD2.
 */
export class TauriBlecTransport implements OBD2Transport {
  private connected = false;
  private name = 'Adaptador OBD-II';
  private address: string | null = null;
  private matched: BLEProfile | null = null;
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;

  // El runtime nativo siempre puede acceder a BLE (el adaptador podría estar
  // apagado, pero eso se maneja en tiempo de conexión, no aquí).
  get isSupported(): boolean {
    return true;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get deviceName(): string {
    return this.name;
  }

  get matchedProfile(): BLEProfile | null {
    return this.matched;
  }

  get isOBDLinkDevice(): boolean {
    if (this.name.toLowerCase().includes('obdlink')) return true;
    return this.matched?.name.includes('OBDLink') ?? false;
  }

  onData(cb: (chunk: Uint8Array) => void): void {
    this.dataCb = cb;
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCb = cb;
  }

  /** Escanea durante SCAN_TIMEOUT_MS y devuelve los dispositivos deduplicados. */
  private async scan(): Promise<BleDevice[]> {
    const found = new Map<string, BleDevice>();
    await startScan((devices) => {
      for (const d of devices) found.set(d.address, d);
    }, SCAN_TIMEOUT_MS);
    try {
      await stopScan();
    } catch {
      /* el scan ya pudo terminar solo */
    }
    return [...found.values()];
  }

  /** Conexión GATT + sondeo de perfil + suscripción a notificaciones. */
  private async setup(device: BleDevice): Promise<void> {
    await blecConnect(device.address, () => {
      this.connected = false;
      this.matched = null;
      this.disconnectCb?.();
    });

    this.address = device.address;
    this.name = device.name || 'Adaptador OBD-II';

    const services = await listServices(device.address);
    if (typeof services === 'string') {
      await blecDisconnect().catch(() => null);
      throw new Error(`No se pudieron leer los servicios BLE: ${services}`);
    }

    this.matched = matchProfile(services);
    if (!this.matched) {
      await blecDisconnect().catch(() => null);
      throw new Error('Adaptador no reconocido. Asegúrate de que es un ELM327/STN compatible.');
    }

    if (import.meta.env.DEV) {
      console.info(`[obd2] (nativo) Conectado usando perfil: ${this.matched.name}`);
    }

    await blecSubscribe(this.matched.notifyUUID, (data) => {
      this.dataCb?.(Uint8Array.from(data));
    });

    this.connected = true;
    try {
      localStorage.setItem(LS_LAST_ADDRESS, this.address);
      localStorage.setItem(LS_LAST_NAME, this.name);
    } catch {
      /* localStorage no disponible: la reconexión silenciosa quedará deshabilitada */
    }
  }

  async connect(): Promise<void> {
    try {
      await checkPermissions(true);
    } catch {
      /* en macOS el permiso lo cubre NSBluetoothAlwaysUsageDescription */
    }

    const devices = await this.scan();
    const device = pickObdDevice(devices);
    if (!device) {
      throw new Error(
        'No se encontró ningún adaptador OBD-II. Enciende el contacto, activa el Bluetooth y vuelve a intentarlo.',
      );
    }
    await this.setup(device);
  }

  async tryAutoConnect(): Promise<string | null> {
    let lastAddress: string | null = null;
    try {
      lastAddress = localStorage.getItem(LS_LAST_ADDRESS);
    } catch {
      return null;
    }
    if (!lastAddress) return null;

    const devices = await this.scan();
    const device = devices.find((d) => d.address === lastAddress) ?? pickObdDevice(devices);
    if (!device) return null;

    try {
      await this.setup(device);
      return this.name;
    } catch {
      this.connected = false;
      this.matched = null;
      return null;
    }
  }

  async getPreviousDevices(): Promise<string[]> {
    try {
      const name = localStorage.getItem(LS_LAST_NAME);
      return name ? [name] : [];
    } catch {
      return [];
    }
  }

  async disconnect(): Promise<void> {
    if (this.matched) {
      try {
        await blecUnsubscribe(this.matched.notifyUUID);
      } catch {
        /* ignore */
      }
    }
    try {
      await blecDisconnect();
    } catch {
      /* ignore */
    }
    this.connected = false;
    this.matched = null;
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.connected || !this.matched) throw new Error('No conectado');
    await blecSend(
      this.matched.writeUUID,
      Array.from(bytes),
      'withoutResponse',
      this.matched.serviceUUID,
    );
  }
}
