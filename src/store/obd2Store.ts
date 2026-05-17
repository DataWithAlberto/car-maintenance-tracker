import { create } from 'zustand';
import type { LiveData, DTC } from '../services/obd2.service';

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
  // Actions
  setStatus: (status: ConnectionStatus, errorMsg?: string) => void;
  setDeviceName: (name: string) => void;
  setLiveData: (data: LiveData) => void;
  setPolling: (v: boolean) => void;
  setDtcs: (dtcs: DTC[], loaded: boolean) => void;
  setVin: (vin: string | null, loaded: boolean) => void;
  reset: () => void;
}

const emptyLiveData: LiveData = {
  rpm: null, speed: null, coolantTemp: null, fuelLevel: null, odometer: null,
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

  setStatus: (status, errorMsg = '') => set({ status, errorMsg }),
  setDeviceName: (deviceName) => set({ deviceName }),
  setLiveData: (liveData) => set({ liveData }),
  setPolling: (isPolling) => set({ isPolling }),
  setDtcs: (dtcs, dtcsLoaded) => set({ dtcs, dtcsLoaded }),
  setVin: (vin, vinLoaded) => set({ vin, vinLoaded }),
  reset: () => set({
    status: 'disconnected', deviceName: '', errorMsg: '',
    liveData: emptyLiveData, isPolling: false,
    dtcs: [], dtcsLoaded: false, vin: null, vinLoaded: false,
  }),
}));
