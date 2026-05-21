import { decodeDtcBytes } from '../utils/dtcCodes';

export interface LiveData {
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
  fuelLevel: number | null;
  odometer: number | null;
}

export interface DTC {
  code: string;
  raw: string;
}

// ─── Known ELM327 BLE profiles ─────────────────────────────────────────────────
const BLE_PROFILES = [
  {
    // Nordic UART Service (most common BLE adapters)
    serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    writeUUID:   '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    notifyUUID:  '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
  },
  {
    // Common Chinese ELM327 adapters
    serviceUUID: '0000fff0-0000-1000-8000-00805f9b34fb',
    writeUUID:   '0000fff2-0000-1000-8000-00805f9b34fb',
    notifyUUID:  '0000fff1-0000-1000-8000-00805f9b34fb',
  },
  {
    // BTLE-miniOBD / some clones
    serviceUUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
    writeUUID:   '0000ffe1-0000-1000-8000-00805f9b34fb',
    notifyUUID:  '0000ffe1-0000-1000-8000-00805f9b34fb',
  },
];

class OBD2Service {
  private device: BluetoothDevice | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  private rxBuffer = '';
  private pendingResolve: ((v: string) => void) | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  get isSupported(): boolean {
    return 'bluetooth' in navigator;
  }

  get isConnected(): boolean {
    return this.device?.gatt?.connected === true;
  }

  get deviceName(): string {
    return this.device?.name ?? 'Adaptador OBD-II';
  }

  // ─── Connection ──────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (!this.isSupported) throw new Error('Web Bluetooth no está disponible en este navegador');

    const optionalServices = BLE_PROFILES.map((p) => p.serviceUUID);

    this.device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices,
    });

    if (!this.device.gatt) throw new Error('Dispositivo no soporta GATT');

    const server = await this.device.gatt.connect();

    // Try profiles in order
    let connected = false;
    for (const profile of BLE_PROFILES) {
      try {
        const service = await server.getPrimaryService(profile.serviceUUID);
        this.writeChar = await service.getCharacteristic(profile.writeUUID);
        this.notifyChar = await service.getCharacteristic(profile.notifyUUID);
        connected = true;
        break;
      } catch {
        // Try next profile
      }
    }

    if (!connected) throw new Error('Adaptador no reconocido. Asegúrate de que es un ELM327 compatible.');

    // Subscribe to notifications
    await this.notifyChar!.startNotifications();
    this.notifyChar!.addEventListener('characteristicvaluechanged', this.onData);

    // Init ELM327
    await this.sendRaw('ATZ\r', 2000);   // reset
    await this.sendRaw('ATE0\r');         // echo off
    await this.sendRaw('ATL0\r');         // linefeeds off
    await this.sendRaw('ATS0\r');         // spaces off
    await this.sendRaw('ATH0\r');         // headers off
    await this.sendRaw('ATSP0\r');        // auto protocol

    // Listen for disconnect
    this.device.addEventListener('gattserverdisconnected', () => {
      this.writeChar = null;
      this.notifyChar = null;
      this.stopPolling();
    });
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    if (this.notifyChar) {
      try { await this.notifyChar.stopNotifications(); } catch { /* ignore */ }
      this.notifyChar.removeEventListener('characteristicvaluechanged', this.onData);
    }
    this.device?.gatt?.disconnect();
    this.device = null;
    this.writeChar = null;
    this.notifyChar = null;
  }

  // ─── Data handler ─────────────────────────────────────────────────────────────

  private onData = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value!;
    const chunk = new TextDecoder().decode(value);
    this.rxBuffer += chunk;
    if (this.rxBuffer.includes('>')) {
      const response = this.rxBuffer.trim();
      this.rxBuffer = '';
      this.pendingResolve?.(response);
      this.pendingResolve = null;
    }
  };

  // ─── Send / receive ──────────────────────────────────────────────────────────

  private async sendRaw(cmd: string, timeoutMs = 1500): Promise<string> {
    if (!this.writeChar) throw new Error('No conectado');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResolve = null;
        resolve('TIMEOUT');
      }, timeoutMs);
      this.pendingResolve = (v) => { clearTimeout(timer); resolve(v); };
      this.writeChar!.writeValue(new TextEncoder().encode(cmd)).catch(reject);
    });
  }

  private parseHexBytes(response: string): number[] {
    return response
      .replace(/[^0-9A-Fa-f\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((h) => parseInt(h, 16))
      .filter((n) => !isNaN(n));
  }

  // ─── PIDs ─────────────────────────────────────────────────────────────────────

  async readRpm(): Promise<number | null> {
    try {
      const res = await this.sendRaw('010C\r');
      const bytes = this.parseHexBytes(res.replace(/^41\s*0C\s*/i, ''));
      if (bytes.length < 2) return null;
      return Math.round(((bytes[0] * 256) + bytes[1]) / 4);
    } catch { return null; }
  }

  async readSpeed(): Promise<number | null> {
    try {
      const res = await this.sendRaw('010D\r');
      const bytes = this.parseHexBytes(res.replace(/^41\s*0D\s*/i, ''));
      return bytes[0] ?? null;
    } catch { return null; }
  }

  async readCoolantTemp(): Promise<number | null> {
    try {
      const res = await this.sendRaw('0105\r');
      const bytes = this.parseHexBytes(res.replace(/^41\s*05\s*/i, ''));
      if (bytes[0] == null) return null;
      return bytes[0] - 40;
    } catch { return null; }
  }

  async readFuelLevel(): Promise<number | null> {
    try {
      const res = await this.sendRaw('012F\r');
      const bytes = this.parseHexBytes(res.replace(/^41\s*2F\s*/i, ''));
      if (bytes[0] == null) return null;
      return Math.round((bytes[0] * 100) / 255);
    } catch { return null; }
  }

  /** Odometer via PID A6 (not universally supported). */
  async readOdometer(): Promise<number | null> {
    try {
      const res = await this.sendRaw('01A6\r', 2000);
      if (res.includes('NO DATA') || res.includes('ERROR') || res.includes('TIMEOUT')) return null;
      const bytes = this.parseHexBytes(res.replace(/^41\s*A6\s*/i, ''));
      if (bytes.length < 4) return null;
      return Math.round(((bytes[0] * 16777216) + (bytes[1] * 65536) + (bytes[2] * 256) + bytes[3]) / 10);
    } catch { return null; }
  }

  async readLiveData(): Promise<LiveData> {
    const [rpm, speed, coolantTemp, fuelLevel, odometer] = await Promise.all([
      this.readRpm(),
      this.readSpeed(),
      this.readCoolantTemp(),
      this.readFuelLevel(),
      this.readOdometer(),
    ]);
    return { rpm, speed, coolantTemp, fuelLevel, odometer };
  }

  // ─── DTCs ─────────────────────────────────────────────────────────────────────

  async readDtcs(): Promise<DTC[]> {
    const res = await this.sendRaw('03\r', 5000);
    const lines = res.split('\n').map((l) => l.trim()).filter(Boolean);
    const dtcs: DTC[] = [];

    for (const line of lines) {
      if (line === '>' || line.startsWith('NO') || line.startsWith('43 00')) continue;
      const clean = line.replace(/^43\s*/i, '');
      const bytes = this.parseHexBytes(clean);
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const b1 = bytes[i];
        const b2 = bytes[i + 1];
        if (b1 === 0 && b2 === 0) continue;
        dtcs.push({ code: decodeDtcBytes(b1, b2), raw: `${b1.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`.toUpperCase() });
      }
    }
    return dtcs;
  }

  async clearDtcs(): Promise<void> {
    await this.sendRaw('04\r', 3000);
  }

  // ─── VIN ─────────────────────────────────────────────────────────────────────

  async readVin(): Promise<string | null> {
    try {
      await this.sendRaw('ATSH7DF\r');
      const res = await this.sendRaw('0902\r', 5000);
      if (res.includes('NO DATA') || res.includes('ERROR')) return null;

      // Extract all hex bytes, skip mode/pid/frame bytes, decode ASCII
      const allBytes = this.parseHexBytes(res.replace(/\n/g, ' '));
      // Find 0x49 0x02 marker and take next 17 bytes
      const vinBytes: number[] = [];
      let collecting = false;
      for (let i = 0; i < allBytes.length; i++) {
        if (!collecting && allBytes[i] === 0x49 && allBytes[i + 1] === 0x02) {
          i += 2; // skip frame index byte too
          if (allBytes[i] <= 0x03) i++; // skip frame counter
          collecting = true;
        }
        if (collecting && allBytes[i] >= 0x20 && allBytes[i] < 0x7f) {
          vinBytes.push(allBytes[i]);
        }
        if (vinBytes.length === 17) break;
      }
      if (vinBytes.length < 5) return null;
      return String.fromCharCode(...vinBytes).replace(/[^A-Z0-9]/gi, '');
    } catch { return null; }
  }

  // ─── Live polling ─────────────────────────────────────────────────────────────

  startPolling(onData: (data: LiveData) => void, intervalMs = 2000): void {
    this.stopPolling();
    const tick = async () => {
      if (!this.isConnected) { this.stopPolling(); return; }
      const data = await this.readLiveData();
      onData(data);
    };
    tick();
    this.pollInterval = setInterval(tick, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }
}

export const obd2Service = new OBD2Service();
