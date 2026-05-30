import { BLE_PROFILES, type BLEProfile } from './profiles';
import type { OBD2Transport } from './transport';

/**
 * Transporte basado en la Web Bluetooth API.
 *
 * Es el camino usado por el build web (Chrome / Edge / Android Chrome). Replica
 * exactamente el comportamiento histórico de la app: selector nativo del
 * navegador, sondeo de perfiles GATT en orden de prioridad y reconexión
 * silenciosa vía `navigator.bluetooth.getDevices()`.
 */
export class WebBluetoothTransport implements OBD2Transport {
  private device: BluetoothDevice | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private matched: BLEProfile | null = null;
  private dataCb: ((chunk: Uint8Array) => void) | null = null;
  private disconnectCb: (() => void) | null = null;

  get isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  get isConnected(): boolean {
    return this.device?.gatt?.connected === true;
  }

  get deviceName(): string {
    return this.device?.name ?? 'Adaptador OBD-II';
  }

  get matchedProfile(): BLEProfile | null {
    return this.matched;
  }

  get isOBDLinkDevice(): boolean {
    const name = this.device?.name?.toLowerCase() ?? '';
    if (name.includes('obdlink')) return true;
    return this.matched?.name.includes('OBDLink') ?? false;
  }

  onData(cb: (chunk: Uint8Array) => void): void {
    this.dataCb = cb;
  }

  onDisconnect(cb: () => void): void {
    this.disconnectCb = cb;
  }

  private onChar = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    this.dataCb?.(new Uint8Array(value.buffer));
  };

  /** Conexión GATT + sondeo de perfil + suscripción a notificaciones. */
  private async setup(device: BluetoothDevice): Promise<void> {
    if (!device.gatt) throw new Error('Dispositivo no soporta GATT');

    const server = await device.gatt.connect();

    this.matched = null;
    let connected = false;
    for (const profile of BLE_PROFILES) {
      try {
        const service = await server.getPrimaryService(profile.serviceUUID);
        this.writeChar = await service.getCharacteristic(profile.writeUUID);
        this.notifyChar = await service.getCharacteristic(profile.notifyUUID);
        this.matched = profile;
        connected = true;
        if (import.meta.env.DEV) {
          console.info(`[obd2] Conectado usando perfil: ${profile.name}`);
        }
        break;
      } catch {
        // probar el siguiente perfil
      }
    }

    if (!connected)
      throw new Error('Adaptador no reconocido. Asegúrate de que es un ELM327/STN compatible.');

    await this.notifyChar!.startNotifications();
    this.notifyChar!.addEventListener('characteristicvaluechanged', this.onChar);

    device.addEventListener('gattserverdisconnected', () => {
      this.writeChar = null;
      this.notifyChar = null;
      this.disconnectCb?.();
    });
  }

  async connect(): Promise<void> {
    if (!this.isSupported) throw new Error('Web Bluetooth no está disponible en este navegador');

    const optionalServices = BLE_PROFILES.map((p) => p.serviceUUID);
    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices,
    });

    await this.setup(this.device);
  }

  async tryAutoConnect(): Promise<string | null> {
    if (!this.isSupported) return null;

    const bt = navigator.bluetooth as Bluetooth & {
      getDevices?: () => Promise<BluetoothDevice[]>;
    };
    if (typeof bt.getDevices !== 'function') return null;

    let devices: BluetoothDevice[];
    try {
      devices = await bt.getDevices();
    } catch {
      return null;
    }

    if (devices.length === 0) return null;

    for (const device of devices) {
      try {
        this.device = device;
        await this.setup(device);
        return device.name ?? 'Adaptador OBD-II';
      } catch {
        this.device = null;
        this.writeChar = null;
        this.notifyChar = null;
      }
    }

    return null;
  }

  async getPreviousDevices(): Promise<string[]> {
    if (!this.isSupported) return [];
    const bt = navigator.bluetooth as Bluetooth & {
      getDevices?: () => Promise<BluetoothDevice[]>;
    };
    if (typeof bt.getDevices !== 'function') return [];
    try {
      const devices = await bt.getDevices();
      return devices.map((d) => d.name ?? 'Adaptador OBD-II');
    } catch {
      return [];
    }
  }

  async disconnect(): Promise<void> {
    if (this.notifyChar) {
      try {
        await this.notifyChar.stopNotifications();
      } catch {
        /* ignore */
      }
      this.notifyChar.removeEventListener('characteristicvaluechanged', this.onChar);
    }
    this.device?.gatt?.disconnect();
    this.device = null;
    this.writeChar = null;
    this.notifyChar = null;
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.writeChar) throw new Error('No conectado');
    await this.writeChar.writeValue(bytes as BufferSource);
  }
}
