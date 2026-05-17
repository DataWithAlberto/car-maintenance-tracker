import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu, Bluetooth, BluetoothOff, Zap, Gauge, Thermometer, Fuel, Milestone,
  AlertTriangle, CheckCircle, RefreshCw, Car, Trash2, ClipboardCopy, Download,
  Play, Square,
} from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { useOBD2Store } from '../store/obd2Store';
import { useVehicle } from '../hooks/useVehicle';
import { obd2Service } from '../services/obd2.service';
import { getDtcDescription } from '../utils/dtcCodes';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { KpiCard } from '../components/ui/KpiCard';
import toast from 'react-hot-toast';

// ─── Gauge bar ───────────────────────────────────────────────────────────────
const GaugeBar = ({ value, max, color = '#0071e3' }: { value: number; max: number; color?: string }) => (
  <div className="mt-2 h-1 w-full bg-silver-mist rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
    />
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
    connected:    { label: 'Conectado',    bg: '#e3f0e3', fg: '#2f6b34', dot: '#1a9e3f' },
    connecting:   { label: 'Conectando…', bg: '#fdf1d9', fg: '#9a6700', dot: '#c77700' },
    disconnected: { label: 'Desconectado', bg: '#f5f5f7', fg: '#707070', dot: '#a1a1a6' },
    error:        { label: 'Error',        bg: '#fce8e0', fg: '#b64400', dot: '#d70015' },
  };
  const s = map[status] ?? map.disconnected;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono uppercase rounded-full px-3 py-1"
      style={{ fontSize: 10, letterSpacing: '0.1em', background: s.bg, color: s.fg }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, background: s.dot }} />
      {s.label}
    </span>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export const OBD2Page = () => {
  const { selectedVehicle } = useVehicleStore();
  const { updateVehicle } = useVehicle();
  const navigate = useNavigate();
  const {
    status, deviceName, errorMsg, liveData, isPolling, dtcs, dtcsLoaded, vin, vinLoaded,
    setStatus, setDeviceName, setLiveData, setPolling, setDtcs, setVin, reset,
  } = useOBD2Store();

  const [dtcLoading, setDtcLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  if (!selectedVehicle) {
    return (
      <div className="px-6 sm:px-10 py-16">
        <EmptyState
          icon={Car}
          title="Selecciona un vehículo"
          description="Elige un vehículo desde el Dashboard para usar OBD-II."
          action={<Button variant="accent" onClick={() => navigate('/dashboard')}>Ir al Dashboard</Button>}
        />
      </div>
    );
  }

  const connected = status === 'connected';

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    if (!obd2Service.isSupported) {
      toast.error('Web Bluetooth no disponible. Usa Chrome en Android o macOS.');
      return;
    }
    setStatus('connecting');
    try {
      await obd2Service.connect();
      setDeviceName(obd2Service.deviceName);
      setStatus('connected');
      toast.success(`Conectado a ${obd2Service.deviceName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al conectar';
      setStatus('error', msg);
      toast.error(msg);
    }
  };

  const handleDisconnect = async () => {
    obd2Service.stopPolling();
    setPolling(false);
    await obd2Service.disconnect();
    reset();
    toast.success('Desconectado');
  };

  const handleStartPolling = () => {
    setPolling(true);
    obd2Service.startPolling((data) => setLiveData(data), 2000);
  };

  const handleStopPolling = () => {
    obd2Service.stopPolling();
    setPolling(false);
  };

  const handleReadOnce = async () => {
    try {
      const data = await obd2Service.readLiveData();
      setLiveData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error leyendo datos');
    }
  };

  const handleReadDtcs = async () => {
    setDtcLoading(true);
    try {
      const codes = await obd2Service.readDtcs();
      setDtcs(codes, true);
      toast.success(codes.length === 0 ? 'Sin códigos de error' : `${codes.length} código${codes.length > 1 ? 's' : ''} detectado${codes.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error leyendo DTCs');
    } finally {
      setDtcLoading(false);
    }
  };

  const handleClearDtcs = async () => {
    setClearLoading(true);
    try {
      await obd2Service.clearDtcs();
      setDtcs([], true);
      toast.success('Códigos borrados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error borrando DTCs');
    } finally {
      setClearLoading(false);
    }
  };

  const handleReadVin = async () => {
    setVinLoading(true);
    try {
      const v = await obd2Service.readVin();
      setVin(v, true);
      if (v) toast.success(`VIN leído: ${v}`);
      else toast.error('No se pudo leer el VIN. Algunos vehículos no lo exponen.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error leyendo VIN');
    } finally {
      setVinLoading(false);
    }
  };

  const handleSaveVin = async () => {
    if (!vin) return;
    await updateVehicle(selectedVehicle.id, { vin });
    toast.success('VIN guardado en el vehículo');
  };

  const handleImportKm = async () => {
    const km = liveData.odometer;
    if (!km) { toast.error('Odómetro no disponible en este vehículo'); return; }
    await updateVehicle(selectedVehicle.id, { current_km: km });
    toast.success(`${km.toLocaleString('es-ES')} km importados`);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 sm:px-10 py-10 space-y-8">
      {/* Header */}
      <header>
        <span className="eyebrow">
          {selectedVehicle.brand} {selectedVehicle.model}
          {selectedVehicle.license_plate ? ` · ${selectedVehicle.license_plate}` : ''}
        </span>
        <h1
          className="text-ink"
          style={{
            fontFamily: 'Inter, var(--font-sf-pro-display)',
            fontWeight: 700,
            fontSize: 'clamp(40px, 6vw, 56px)',
            lineHeight: 1.07,
            letterSpacing: '-0.9px',
            margin: '12px 0 0',
          }}
        >
          OBD-II.
        </h1>
        <p className="font-text text-graphite mt-3 max-w-xl" style={{ fontSize: 15, lineHeight: 1.45 }}>
          Conecta un adaptador ELM327 Bluetooth para leer datos en tiempo real,
          códigos de error y el VIN de tu coche.
        </p>
      </header>

      {/* Browser support warning */}
      {!obd2Service.isSupported && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" style={{ color: '#b64400' }} strokeWidth={1.6} />
            </div>
            <div>
              <h3 className="font-display text-ink" style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}>
                Navegador no compatible
              </h3>
              <p className="font-text text-graphite mt-2" style={{ fontSize: 15, lineHeight: 1.45 }}>
                Web Bluetooth requiere <strong>Chrome</strong> o <strong>Edge</strong> en Android, macOS o Windows.
                No funciona en Safari, Firefox ni iOS.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Connection card */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <h2 className="font-mono uppercase text-graphite mb-5" style={{ fontSize: 11, letterSpacing: '0.14em' }}>
          Conexión Bluetooth
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className="h-14 w-14 rounded-[16px] flex items-center justify-center shrink-0"
            style={{ background: connected ? '#e3f0e3' : '#f5f5f7' }}
          >
            {connected
              ? <Bluetooth className="h-6 w-6" style={{ color: '#2f6b34' }} strokeWidth={1.6} />
              : <BluetoothOff className="h-6 w-6 text-graphite" strokeWidth={1.6} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-display text-ink" style={{ fontWeight: 600, fontSize: 18, letterSpacing: '-0.2px' }}>
                {connected ? deviceName : 'Sin conexión'}
              </p>
              <StatusBadge status={status} />
            </div>
            {errorMsg && (
              <p className="font-text mt-1" style={{ fontSize: 13, color: '#b64400' }}>{errorMsg}</p>
            )}
            {!connected && (
              <p className="font-text text-graphite mt-1" style={{ fontSize: 13 }}>
                Necesitas un adaptador ELM327 BLE enchufado al puerto OBD-II del coche.
              </p>
            )}
          </div>
          {connected ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDisconnect}
              iconLeft={<BluetoothOff className="h-4 w-4" strokeWidth={1.6} />}
            >
              Desconectar
            </Button>
          ) : (
            <Button
              variant="accent"
              size="sm"
              loading={status === 'connecting'}
              onClick={handleConnect}
              disabled={!obd2Service.isSupported}
              iconLeft={status !== 'connecting' ? <Bluetooth className="h-4 w-4" strokeWidth={1.6} /> : undefined}
            >
              Conectar adaptador
            </Button>
          )}
        </div>
      </section>

      {/* Live data */}
      {connected && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-mono uppercase text-graphite" style={{ fontSize: 11, letterSpacing: '0.14em' }}>
              Datos en tiempo real
            </h2>
            <div className="flex items-center gap-2">
              {!isPolling ? (
                <>
                  <Button variant="secondary" size="sm" onClick={handleReadOnce}
                    iconLeft={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.7} />}>
                    Leer
                  </Button>
                  <Button variant="accent" size="sm" onClick={handleStartPolling}
                    iconLeft={<Play className="h-3.5 w-3.5" strokeWidth={1.7} />}>
                    Auto
                  </Button>
                </>
              ) : (
                <Button variant="danger" size="sm" onClick={handleStopPolling}
                  iconLeft={<Square className="h-3.5 w-3.5" strokeWidth={1.7} />}>
                  Parar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-fog rounded-[20px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full" style={{ width: 6, height: 6, background: '#0071e3' }} />
                <span className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  RPM
                </span>
                <Zap className="h-3.5 w-3.5 text-graphite ml-auto" strokeWidth={1.6} />
              </div>
              <p className="text-ink tabular-nums" style={{ fontWeight: 700, fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '-0.4px' }}>
                {liveData.rpm != null ? liveData.rpm.toLocaleString('es-ES') : '—'}
              </p>
              <p className="font-text text-graphite mt-0.5" style={{ fontSize: 12 }}>rev/min</p>
              {liveData.rpm != null && <GaugeBar value={liveData.rpm} max={8000} color="#0071e3" />}
            </div>

            <div className="bg-fog rounded-[20px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full" style={{ width: 6, height: 6, background: '#1a9e3f' }} />
                <span className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  Velocidad
                </span>
                <Gauge className="h-3.5 w-3.5 text-graphite ml-auto" strokeWidth={1.6} />
              </div>
              <p className="text-ink tabular-nums" style={{ fontWeight: 700, fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '-0.4px' }}>
                {liveData.speed != null ? liveData.speed : '—'}
              </p>
              <p className="font-text text-graphite mt-0.5" style={{ fontSize: 12 }}>km/h</p>
              {liveData.speed != null && <GaugeBar value={liveData.speed} max={250} color="#1a9e3f" />}
            </div>

            <div className="bg-fog rounded-[20px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full" style={{ width: 6, height: 6, background: liveData.coolantTemp != null && liveData.coolantTemp > 110 ? '#d70015' : '#c77700' }} />
                <span className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  Refrigerante
                </span>
                <Thermometer className="h-3.5 w-3.5 text-graphite ml-auto" strokeWidth={1.6} />
              </div>
              <p className="text-ink tabular-nums" style={{ fontWeight: 700, fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '-0.4px' }}>
                {liveData.coolantTemp != null ? liveData.coolantTemp : '—'}
              </p>
              <p className="font-text text-graphite mt-0.5" style={{ fontSize: 12 }}>°C</p>
              {liveData.coolantTemp != null && (
                <GaugeBar value={liveData.coolantTemp + 40} max={175}
                  color={liveData.coolantTemp > 110 ? '#d70015' : '#c77700'} />
              )}
            </div>

            <div className="bg-fog rounded-[20px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full" style={{ width: 6, height: 6, background: liveData.fuelLevel != null && liveData.fuelLevel < 15 ? '#d70015' : '#b64400' }} />
                <span className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  Combustible
                </span>
                <Fuel className="h-3.5 w-3.5 text-graphite ml-auto" strokeWidth={1.6} />
              </div>
              <p className="text-ink tabular-nums" style={{ fontWeight: 700, fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: '-0.4px' }}>
                {liveData.fuelLevel != null ? `${liveData.fuelLevel}%` : '—'}
              </p>
              <p className="font-text text-graphite mt-0.5" style={{ fontSize: 12 }}>nivel</p>
              {liveData.fuelLevel != null && (
                <GaugeBar value={liveData.fuelLevel} max={100}
                  color={liveData.fuelLevel < 15 ? '#d70015' : '#b64400'} />
              )}
            </div>
          </div>

          {/* Odometer + import km */}
          <div className="flex items-center justify-between gap-4 flex-wrap bg-fog rounded-[18px] px-5 py-4">
            <div className="flex items-center gap-3">
              <Milestone className="h-4 w-4 text-graphite" strokeWidth={1.6} />
              <div>
                <p className="font-mono uppercase text-graphite" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                  Odómetro
                </p>
                <p className="font-text text-ink font-semibold" style={{ fontSize: 16 }}>
                  {liveData.odometer != null
                    ? `${liveData.odometer.toLocaleString('es-ES')} km`
                    : 'No disponible en este vehículo'}
                </p>
              </div>
            </div>
            {liveData.odometer != null && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleImportKm}
                iconLeft={<Download className="h-3.5 w-3.5" strokeWidth={1.7} />}
              >
                Importar km
              </Button>
            )}
          </div>
        </section>
      )}

      {/* VIN */}
      {connected && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="font-mono uppercase text-graphite" style={{ fontSize: 11, letterSpacing: '0.14em' }}>
              VIN del vehículo
            </h2>
            <Button
              variant="secondary"
              size="sm"
              loading={vinLoading}
              onClick={handleReadVin}
              iconLeft={!vinLoading ? <Cpu className="h-3.5 w-3.5" strokeWidth={1.7} /> : undefined}
            >
              Leer VIN
            </Button>
          </div>

          {vinLoaded && (
            vin ? (
              <div className="bg-fog rounded-[18px] px-5 py-4 space-y-3">
                <p className="font-mono text-ink" style={{ fontSize: 18, letterSpacing: '0.08em' }}>{vin}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handleSaveVin}
                    iconLeft={<CheckCircle className="h-3.5 w-3.5" strokeWidth={1.7} />}
                  >
                    Guardar en vehículo
                  </Button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(vin); toast.success('Copiado'); }}
                    className="inline-flex items-center gap-1.5 font-text text-azure"
                    style={{ fontSize: 13 }}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5" strokeWidth={1.7} />
                    Copiar
                  </button>
                </div>
              </div>
            ) : (
              <p className="font-text text-graphite" style={{ fontSize: 14 }}>
                No se pudo leer el VIN. El adaptador o el vehículo puede no soportarlo.
              </p>
            )
          )}

          {!vinLoaded && (
            <p className="font-text text-graphite" style={{ fontSize: 14 }}>
              El VIN permite identificar el vehículo y completar datos automáticamente.
            </p>
          )}
        </section>
      )}

      {/* DTCs */}
      {connected && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-mono uppercase text-graphite" style={{ fontSize: 11, letterSpacing: '0.14em' }}>
                Códigos de error (DTC)
              </h2>
              {dtcsLoaded && (
                <p className="font-text text-graphite mt-1" style={{ fontSize: 13 }}>
                  {dtcs.length === 0 ? 'Sin errores activos' : `${dtcs.length} código${dtcs.length > 1 ? 's' : ''} activo${dtcs.length > 1 ? 's' : ''}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {dtcsLoaded && dtcs.length > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={clearLoading}
                  onClick={handleClearDtcs}
                  iconLeft={!clearLoading ? <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} /> : undefined}
                >
                  Borrar códigos
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                loading={dtcLoading}
                onClick={handleReadDtcs}
                iconLeft={!dtcLoading ? <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.7} /> : undefined}
              >
                Leer errores
              </Button>
            </div>
          </div>

          {!dtcsLoaded && (
            <div className="bg-fog rounded-[18px] px-5 py-4">
              <p className="font-text text-graphite" style={{ fontSize: 14 }}>
                Lee los códigos de avería almacenados en la ECU del vehículo.
              </p>
            </div>
          )}

          {dtcsLoaded && dtcs.length === 0 && (
            <div className="flex items-center gap-3 bg-fog rounded-[18px] px-5 py-4">
              <CheckCircle className="h-5 w-5 shrink-0" style={{ color: '#1a9e3f' }} strokeWidth={1.7} />
              <p className="font-text text-ink" style={{ fontSize: 15 }}>
                No hay códigos de error activos. ¡El coche está bien!
              </p>
            </div>
          )}

          {dtcsLoaded && dtcs.length > 0 && (
            <div className="space-y-2">
              {dtcs.map((dtc) => {
                const isCritical = dtc.code.startsWith('P030') || dtc.code.startsWith('P031');
                return (
                  <div
                    key={dtc.code}
                    className="flex items-start gap-3 rounded-[14px] px-4 py-3"
                    style={{ background: isCritical ? '#fce8e0' : '#f5f5f7', border: `1px solid ${isCritical ? '#f5c6b0' : '#e8e8ed'}` }}
                  >
                    <div className="shrink-0 mt-0.5">
                      <span
                        className="font-mono font-bold"
                        style={{ fontSize: 13, color: isCritical ? '#b64400' : '#1d1d1f' }}
                      >
                        {dtc.code}
                      </span>
                    </div>
                    <p className="font-text text-ink flex-1" style={{ fontSize: 13, lineHeight: 1.45 }}>
                      {getDtcDescription(dtc.code)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Not connected placeholder */}
      {!connected && status !== 'connecting' && (
        <KpiCard
          icon={Cpu}
          label="OBD-II listo"
          value="Conecta el adaptador"
          hint="Necesitas un ELM327 BLE enchufado al puerto debajo del volante"
          tone="neutral"
        />
      )}
    </div>
  );
};
