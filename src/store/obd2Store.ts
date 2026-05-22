import { create } from 'zustand';
import type { LiveData, DTC } from '../services/obd2.service';
import type { OBD2Anomaly } from '../types';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface OBD2State {
  status: ConnectionStatus;
  deviceName: string;
  errorMsg: string;
  liveData: LiveData;
  isPolling: boolean;
  dtcs: DTC[];
  dtcsLoaded: boolean;
  vin: string | null;
  vinLoaded: boolean;
  readings: LiveData[];
  anomalies: OBD2Anomaly[];
  isRecording: boolean;
  // Actions
  setStatus: (status: ConnectionStatus, errorMsg?: string) => void;
  setDeviceName: (name: string) => void;
  setLiveData: (data: LiveData) => void;
  setPolling: (v: boolean) => void;
  setDtcs: (dtcs: DTC[], loaded: boolean) => void;
  setVin: (vin: string | null, loaded: boolean) => void;
  addReading: (data: LiveData) => void;
  setReadings: (readings: LiveData[]) => void;
  addAnomaly: (anomaly: OBD2Anomaly) => void;
  setAnomalies: (anomalies: OBD2Anomaly[]) => void;
  setIsRecording: (v: boolean) => void;
  clearHistory: () => void;
  reset: () => void;
}

const emptyLiveData: LiveData = {
  rpm: null,
  speed: null,
  coolantTemp: null,
  fuelLevel: null,
  odometer: null,
  oilPressure: null,
  batteryVoltage: null,
  engineLoad: null,
  timingAdvance: null,
  engineRuntime: null,
  mafAirFlow: null,
  fuelTrimBank1: null,
  fuelRate: null,
  shortTermFuelTrim1: null,
  longTermFuelTrim1: null,
  intakeManifoldPressure: null,
  absoluteLoad: null,
  relativeThrottlePos: null,
  ambientAirTemp: null,
  absThrottlePosB: null,
  accPedalPosD: null,
  accPedalPosE: null,
  catalystTempBank1Sensor1: null,
  numEmissionsDtc: null,
};

export const useOBD2Store = create<OBD2State>((set) => ({
  status: 'disconnected',
  deviceName: '',
  errorMsg: '',
  liveData: emptyLiveData,
  isPolling: false,
  dtcs: [],
  dtcsLoaded: false,
  vin: null,
  vinLoaded: false,
  readings: [],
  anomalies: [],
  isRecording: false,

  setStatus: (status, errorMsg = '') => set({ status, errorMsg }),
  setDeviceName: (deviceName) => set({ deviceName }),
  setLiveData: (liveData) => set({ liveData }),
  setPolling: (isPolling) => set({ isPolling }),
  setDtcs: (dtcs, dtcsLoaded) => set({ dtcs, dtcsLoaded }),
  setVin: (vin, vinLoaded) => set({ vin, vinLoaded }),
  addReading: (data) =>
    set((state) => ({
      readings: [...state.readings.slice(-99), data],
    })),
  setReadings: (readings) => set({ readings }),
  addAnomaly: (anomaly) =>
    set((state) => ({
      anomalies: [anomaly, ...state.anomalies].slice(0, 100),
    })),
  setAnomalies: (anomalies) => set({ anomalies }),
  setIsRecording: (isRecording) => set({ isRecording }),
  clearHistory: () => set({ readings: [], anomalies: [] }),
  reset: () =>
    set({
      status: 'disconnected',
      deviceName: '',
      errorMsg: '',
      liveData: emptyLiveData,
      isPolling: false,
      dtcs: [],
      dtcsLoaded: false,
      vin: null,
      vinLoaded: false,
      readings: [],
      anomalies: [],
      isRecording: false,
    }),
}));
