import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { syncQueueService } from './syncQueue.service';
import type { LiveData } from './obd2.service';
import type { OBD2Anomaly } from '../types';

// jsdom no expone localStorage por defecto en esta versión: lo polifillamos
// con un Map en memoria que respeta la API.
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    const mock: Storage = {
      getItem: (k) => (store.has(k) ? store.get(k)! : null),
      setItem: (k, v) => {
        store.set(k, String(v));
      },
      removeItem: (k) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: mock, configurable: true });
  }
});

const makeReading = (rpm: number | null = 2000): LiveData => ({
  rpm,
  speed: 50,
  coolantTemp: 90,
  fuelLevel: 60,
  odometer: 50000,
  oilPressure: 300,
  batteryVoltage: 13.5,
  engineLoad: 35,
  timingAdvance: null,
  engineRuntime: 600,
  mafAirFlow: null,
  fuelTrimBank1: null,
  fuelRate: null,
  shortTermFuelTrim1: null,
  longTermFuelTrim1: null,
  intakeManifoldPressure: null,
  absoluteLoad: null,
  relativeThrottlePos: null,
  ambientAirTemp: 22,
  absThrottlePosB: null,
  accPedalPosD: null,
  accPedalPosE: null,
  catalystTempBank1Sensor1: null,
  numEmissionsDtc: null,
});

const makeAnomaly = (): OBD2Anomaly => ({
  type: 'overtemp',
  severity: 'warn',
  value: 100,
  threshold: 95,
  message: 'Temperatura alta',
});

describe('syncQueueService', () => {
  beforeEach(() => {
    // localStorage está disponible en happy-dom
    syncQueueService.clear();
    syncQueueService.stopAutoSync();
  });

  describe('enqueue', () => {
    it('arranca con cola vacía', () => {
      expect(syncQueueService.count).toBe(0);
    });

    it('encola una lectura', () => {
      syncQueueService.enqueueReading('v1', makeReading());
      expect(syncQueueService.count).toBe(1);
    });

    it('encola una anomalía', () => {
      syncQueueService.enqueueAnomaly('v1', makeAnomaly());
      expect(syncQueueService.count).toBe(1);
    });

    it('mantiene varios items en cola', () => {
      syncQueueService.enqueueReading('v1', makeReading(1000));
      syncQueueService.enqueueReading('v1', makeReading(2000));
      syncQueueService.enqueueAnomaly('v2', makeAnomaly());
      expect(syncQueueService.count).toBe(3);
    });

    it('persiste entre instancias (mismo localStorage)', () => {
      syncQueueService.enqueueReading('v1', makeReading());
      // Simulamos recarga leyendo el storage directamente
      const raw = localStorage.getItem('fh-sync-queue');
      expect(raw).toBeTruthy();
      const items = JSON.parse(raw!);
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe('reading');
      expect(items[0].vehicle_id).toBe('v1');
    });
  });

  describe('clear', () => {
    it('vacía la cola', () => {
      syncQueueService.enqueueReading('v1', makeReading());
      syncQueueService.enqueueAnomaly('v1', makeAnomaly());
      expect(syncQueueService.count).toBe(2);
      syncQueueService.clear();
      expect(syncQueueService.count).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('notifica el count inicial al suscribirse', () => {
      syncQueueService.enqueueReading('v1', makeReading());
      const cb = vi.fn();
      const unsub = syncQueueService.subscribe(cb);
      expect(cb).toHaveBeenCalledWith(1);
      unsub();
    });

    it('notifica cambios en el count', () => {
      const cb = vi.fn();
      const unsub = syncQueueService.subscribe(cb);
      cb.mockClear();
      syncQueueService.enqueueReading('v1', makeReading());
      expect(cb).toHaveBeenCalledWith(1);
      syncQueueService.enqueueAnomaly('v1', makeAnomaly());
      expect(cb).toHaveBeenCalledWith(2);
      unsub();
    });

    it('unsuscribe correctamente', () => {
      const cb = vi.fn();
      const unsub = syncQueueService.subscribe(cb);
      cb.mockClear();
      unsub();
      syncQueueService.enqueueReading('v1', makeReading());
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('sync sin red', () => {
    it('no envía nada cuando navigator.onLine = false', async () => {
      const originalOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      syncQueueService.enqueueReading('v1', makeReading());
      const result = await syncQueueService.sync();
      expect(result.sent).toBe(0);
      expect(syncQueueService.count).toBe(1);

      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
    });
  });
});
