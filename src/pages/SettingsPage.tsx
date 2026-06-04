import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil,
  Trash2,
  AlertTriangle,
  Car,
  LogOut,
  KeyRound,
  Sparkles,
  Check,
  FileDown,
  Bell,
  Wrench,
  Copy,
  Moon,
  Sun,
} from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeyStore } from '../store/apiKeyStore';
import { useThemeStore } from '../store/themeStore';
import { useVehicle } from '../hooks/useVehicle';
import { useAuth } from '../hooks/useAuth';
import { useVehicleExport } from '../hooks/useVehicleExport';
import { useWorkshopShare } from '../hooks/useWorkshopShare';
import { supabase } from '../services/supabase';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { FloatingInput } from '../components/ui/FloatingInput';
import { formatKm } from '../utils/formatters';
import { cn } from '../utils/cn';
import { requestNotificationPermission, notificationsSupported } from '../utils/notifications';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { theme, setTheme } = useThemeStore();
  const { updateVehicle, deleteVehicle } = useVehicle();
  const { logout, user } = useAuth();
  const { pushEnabled, setPushEnabled } = useSettingsStore();
  const {
    geminiApiKey,
    setGeminiApiKey,
    clearGeminiApiKey,
    aiProvider,
    setAIProvider,
    ollamaUrl,
    setOllamaUrl,
    ollamaModel,
    setOllamaModel,
  } = useApiKeyStore();
  const { exporting, exportingTax, exportReport, exportTaxReport } =
    useVehicleExport(selectedVehicle);
  const { shareUrl, shareBusy, generateShare, disableShare, copyShare } =
    useWorkshopShare(selectedVehicle);
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(geminiApiKey);
  const [ollamaUrlDraft, setOllamaUrlDraft] = useState(ollamaUrl);
  const [ollamaModelDraft, setOllamaModelDraft] = useState(ollamaModel);
  const [testingOllama, setTestingOllama] = useState(false);
  const [nameDraft, setNameDraft] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? '',
  );
  const [savingName, setSavingName] = useState(false);
  const taxYear = new Date().getFullYear();

  const handleSaveName = async () => {
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameDraft.trim() } });
    setSavingName(false);
    if (error) {
      toast.error('No se pudo guardar el nombre');
      return;
    }
    toast.success('Nombre actualizado');
  };

  const handleTogglePush = async () => {
    if (pushEnabled) {
      setPushEnabled(false);
      toast.success('Recordatorios desactivados');
      return;
    }
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      setPushEnabled(true);
      toast.success('Recordatorios activados');
    } else {
      toast.error('Se denegó el permiso de notificaciones');
    }
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyDraft.trim());
    toast.success(apiKeyDraft.trim() ? 'API key guardada' : 'API key eliminada');
  };

  const handleClearApiKey = () => {
    clearGeminiApiKey();
    setApiKeyDraft('');
    toast.success('API key eliminada');
  };

  const handleSaveOllama = () => {
    setOllamaUrl(ollamaUrlDraft.trim() || 'http://localhost:11434');
    setOllamaModel(ollamaModelDraft.trim() || 'llama3.1');
    toast.success('Configuración de Ollama guardada');
  };

  const handleTestOllama = async () => {
    setTestingOllama(true);
    try {
      const { aiService } = await import('../services/claude.service');
      const res = await aiService.checkOllama({
        url: ollamaUrlDraft.trim() || 'http://localhost:11434',
        model: ollamaModelDraft.trim() || 'llama3.1',
      });
      if (res.ok) {
        toast.success(`Ollama responde. Modelos: ${res.tags.slice(0, 3).join(', ') || '—'}`);
      } else {
        toast.error(res.reason);
      }
    } finally {
      setTestingOllama(false);
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="px-6 sm:px-10 py-16">
        <EmptyState
          icon={Car}
          title="Selecciona un vehículo"
          description="Elige un vehículo desde el Dashboard para configurar sus ajustes."
          action={
            <Button variant="accent" onClick={() => navigate('/dashboard')}>
              Ir al Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  const handleUpdate = async (data: Parameters<typeof updateVehicle>[1]) => {
    await updateVehicle(selectedVehicle.id, data);
    toast.success('Vehículo actualizado');
    setShowEditForm(false);
  };

  const confirmDelete = async () => {
    await deleteVehicle(selectedVehicle.id);
    setShowDeleteConfirm(false);
    toast.success('Vehículo eliminado');
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <div className="px-6 sm:px-10 py-10 space-y-8">
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
          Ajustes.
        </h1>
      </header>

      {/* Account section */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <h2
          className="font-mono uppercase text-graphite mb-4"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          Tu cuenta
        </h2>
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-full bg-ink text-snow flex items-center justify-center font-text font-semibold"
            style={{ fontSize: 15 }}
          >
            {(
              (user?.user_metadata?.full_name as string | undefined)?.trim()?.[0] ??
              user?.email?.[0] ??
              'U'
            ).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-text text-ink font-medium truncate" style={{ fontSize: 15 }}>
              {(user?.user_metadata?.full_name as string | undefined)?.trim() || user?.email}
            </p>
            <p className="font-text text-graphite truncate" style={{ fontSize: 13 }}>
              {(user?.user_metadata?.full_name as string | undefined)?.trim()
                ? user?.email
                : 'Sesión iniciada'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            iconLeft={<LogOut className="h-4 w-4" strokeWidth={1.6} />}
          >
            Salir
          </Button>
        </div>
        <div className="mt-5 flex items-end gap-3 flex-wrap">
          <FloatingInput
            label="Nombre mostrado"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="accent"
            size="sm"
            onClick={handleSaveName}
            loading={savingName}
            disabled={
              nameDraft.trim() === ((user?.user_metadata?.full_name as string | undefined) ?? '')
            }
            iconLeft={<Check className="h-4 w-4" strokeWidth={1.8} />}
          >
            Guardar
          </Button>
        </div>
      </section>

      {/* AI integration */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <h2
          className="font-mono uppercase text-graphite mb-4"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          Inteligencia artificial
        </h2>

        {/* Selector de proveedor */}
        <div className="mb-6">
          <p className="font-text text-graphite mb-3" style={{ fontSize: 13, fontWeight: 500 }}>
            Proveedor activo
          </p>
          <div
            className="inline-flex"
            style={{ gap: 0, padding: 4, background: 'var(--color-fog)', borderRadius: 999 }}
          >
            {(['gemini', 'ollama'] as const).map((p) => {
              const active = aiProvider === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAIProvider(p)}
                  className="transition-colors"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 999,
                    border: 'none',
                    background: active ? '#1d1d1f' : 'transparent',
                    color: active ? '#fff' : '#707070',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {p === 'gemini' ? '☁ Gemini cloud' : '🖥 Ollama local'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bloque Ollama (se muestra siempre, configurable independientemente) */}
        {aiProvider === 'ollama' && (
          <div
            className="flex items-start gap-4 mb-6 pb-6"
            style={{ borderBottom: '1px solid var(--color-silver-mist)' }}
          >
            <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-graphite" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-display text-ink"
                style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}
              >
                Ollama local
              </p>
              <p
                className="font-text text-graphite mt-2 mb-4 max-w-xl"
                style={{ fontSize: 15, lineHeight: 1.45 }}
              >
                Corre el modelo en tu máquina. Instala{' '}
                <a
                  href="https://ollama.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-azure"
                >
                  ollama.com
                </a>{' '}
                y descarga un modelo:{' '}
                <code
                  style={{ background: 'var(--color-fog)', padding: '2px 6px', borderRadius: 4 }}
                >
                  ollama pull llama3.1
                </code>
                . Para que el navegador pueda llamarlo desde Vercel, arranca Ollama con{' '}
                <code
                  style={{ background: 'var(--color-fog)', padding: '2px 6px', borderRadius: 4 }}
                >
                  OLLAMA_ORIGINS="*"
                </code>
                .
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                <FloatingInput
                  label="URL del servidor (http://localhost:11434)"
                  value={ollamaUrlDraft}
                  onChange={(e) => setOllamaUrlDraft(e.target.value)}
                />
                <FloatingInput
                  label="Modelo (ej. llama3.1)"
                  value={ollamaModelDraft}
                  onChange={(e) => setOllamaModelDraft(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleSaveOllama}
                  disabled={
                    ollamaUrlDraft.trim() === ollamaUrl && ollamaModelDraft.trim() === ollamaModel
                  }
                  iconLeft={<Check className="h-4 w-4" strokeWidth={1.8} />}
                >
                  Guardar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestOllama}
                  disabled={testingOllama}
                >
                  {testingOllama ? 'Probando…' : 'Probar conexión'}
                </Button>
                {ollamaUrl && ollamaModel && (
                  <span
                    className="inline-flex items-center gap-1.5 font-text"
                    style={{ fontSize: 13, color: '#2f6b34' }}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    {ollamaModel} @ {ollamaUrl.replace(/^https?:\/\//, '')}
                  </span>
                )}
              </div>

              <p
                className="font-text text-graphite mt-3 max-w-xl"
                style={{ fontSize: 12.5, lineHeight: 1.4 }}
              >
                Nota: las llamadas van directas del navegador a tu Ollama. La app deployada en HTTPS
                puede llamar a http://localhost porque los navegadores permiten esa excepción.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-graphite" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-display text-ink"
              style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}
            >
              API key de Gemini
            </p>
            <p
              className="font-text text-graphite mt-2 mb-4 max-w-xl"
              style={{ fontSize: 15, lineHeight: 1.45 }}
            >
              Opcional si el backend ya tiene <code>GEMINI_API_KEY</code>. Si trabajas sin backend,
              obtén tu clave gratis en{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-azure"
              >
                aistudio.google.com
              </a>
              . La clave local se mantiene solo en memoria durante esta sesión.
            </p>

            <FloatingInput
              label="API key (AIza…)"
              type="password"
              value={apiKeyDraft}
              onChange={(e) => setApiKeyDraft(e.target.value)}
              iconLeft={<KeyRound className="h-4 w-4" strokeWidth={1.7} />}
              className="max-w-md"
            />

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <Button
                variant="accent"
                size="sm"
                onClick={handleSaveApiKey}
                disabled={apiKeyDraft.trim() === geminiApiKey}
                iconLeft={<Check className="h-4 w-4" strokeWidth={1.8} />}
              >
                Guardar
              </Button>
              {geminiApiKey && (
                <Button variant="secondary" size="sm" onClick={handleClearApiKey}>
                  Eliminar clave
                </Button>
              )}
              {geminiApiKey && (
                <span
                  className="inline-flex items-center gap-1.5 font-text"
                  style={{ fontSize: 13, color: '#2f6b34' }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  Configurada
                </span>
              )}
            </div>

            <p
              className="font-text text-graphite mt-3 max-w-xl"
              style={{ fontSize: 12.5, lineHeight: 1.4 }}
            >
              Nota: con backend, la clave segura vive en el servidor. Esta clave local solo se usa
              como respaldo y no se guarda en localStorage.
            </p>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <h2
          className="font-mono uppercase text-graphite mb-4"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          Apariencia
        </h2>
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
            {theme === 'dark' ? (
              <Moon className="h-5 w-5 text-graphite" strokeWidth={1.6} />
            ) : (
              <Sun className="h-5 w-5 text-graphite" strokeWidth={1.6} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-display text-ink"
              style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}
            >
              Tema de la interfaz
            </p>
            <p className="font-text text-graphite mt-1" style={{ fontSize: 14 }}>
              Elige entre modo claro y modo oscuro.
            </p>
          </div>
          <div className="flex bg-fog rounded-full p-1 gap-0.5 select-none">
            {(
              [
                ['light', 'Claro'],
                ['dark', 'Oscuro'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setTheme(v)}
                className={cn(
                  'focus-ring px-4 h-9 rounded-full font-text font-medium transition-colors text-sm',
                  theme === v
                    ? 'bg-snow text-ink border border-silver-mist'
                    : 'text-graphite hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <h2
          className="font-mono uppercase text-graphite mb-4"
          style={{ fontSize: 11, letterSpacing: '0.14em' }}
        >
          Recordatorios
        </h2>
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5 text-graphite" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-display text-ink"
              style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}
            >
              Avisos del sistema
            </p>
            <p className="font-text text-graphite mt-1" style={{ fontSize: 14, lineHeight: 1.45 }}>
              {notificationsSupported()
                ? 'Recibe alertas de mantenimiento, documentos y anomalías OBD2, aunque la app esté en segundo plano.'
                : 'Este dispositivo no admite notificaciones.'}
            </p>
          </div>
          <Button
            variant={pushEnabled ? 'secondary' : 'accent'}
            size="sm"
            onClick={handleTogglePush}
            disabled={!notificationsSupported()}
          >
            {pushEnabled ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </section>

      {/* Workshop mode */}
      {selectedVehicle.role === 'owner' && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
          <h2
            className="font-mono uppercase text-graphite mb-4"
            style={{ fontSize: 11, letterSpacing: '0.14em' }}
          >
            Modo taller
          </h2>
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-graphite" strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="font-display text-ink"
                style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}
              >
                Compartir ficha con el taller
              </p>
              <p
                className="font-text text-graphite mt-2 mb-4 max-w-xl"
                style={{ fontSize: 15, lineHeight: 1.45 }}
              >
                Genera un enlace de solo lectura con el historial de mantenimiento, gastos y
                documentos. El taller lo abre sin cuenta ni contraseña.
              </p>

              {shareUrl ? (
                <>
                  <div className="flex items-center gap-2 max-w-xl">
                    <input
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="flex-1 min-w-0 bg-fog border border-silver-mist rounded-[12px] px-3 h-10 font-mono text-ink"
                      style={{ fontSize: 12 }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={copyShare}
                      iconLeft={<Copy className="h-3.5 w-3.5" strokeWidth={1.7} />}
                    >
                      Copiar
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={disableShare}
                      loading={shareBusy}
                    >
                      Desactivar acceso
                    </Button>
                    <span
                      className="inline-flex items-center gap-1.5 font-text"
                      style={{ fontSize: 13, color: '#2f6b34' }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                      Enlace activo
                    </span>
                  </div>
                </>
              ) : (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={generateShare}
                  loading={shareBusy}
                  iconLeft={<Wrench className="h-4 w-4" strokeWidth={1.7} />}
                >
                  Generar enlace de taller
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Vehicle data */}
      <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
        <div className="flex items-end justify-between mb-5 gap-4 flex-wrap">
          <div>
            <h2
              className="font-mono uppercase text-graphite mb-2"
              style={{ fontSize: 11, letterSpacing: '0.14em' }}
            >
              Datos del vehículo
            </h2>
            <p
              className="font-display text-ink"
              style={{
                fontWeight: 600,
                fontSize: 28,
                lineHeight: 1.2,
                letterSpacing: '-0.36px',
              }}
            >
              {selectedVehicle.brand} {selectedVehicle.model}
              <span className="text-graphite font-normal"> · {selectedVehicle.year}</span>
            </p>
          </div>
          {selectedVehicle.role === 'owner' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEditForm(true)}
              iconLeft={<Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />}
            >
              Editar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            ['Kilómetros', formatKm(selectedVehicle.current_km)],
            ['Matrícula', selectedVehicle.license_plate ?? '—'],
            ['Color', selectedVehicle.color ?? '—'],
            ['Combustible', selectedVehicle.fuel_type ?? '—'],
            ['Transmisión', selectedVehicle.transmission ?? '—'],
            ['VIN', selectedVehicle.vin ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-fog rounded-[14px] px-4 py-3">
              <p
                className="font-mono uppercase text-graphite"
                style={{ fontSize: 10, letterSpacing: '0.12em', fontWeight: 500 }}
              >
                {label}
              </p>
              <p
                className="font-text text-ink font-medium tabular-nums truncate mt-1.5"
                style={{ fontSize: 15 }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-silver-mist flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={exportReport}
            loading={exporting}
            iconLeft={<FileDown className="h-4 w-4" strokeWidth={1.7} />}
          >
            Exportar informe (PDF)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportTaxReport(taxYear)}
            loading={exportingTax}
            iconLeft={<FileDown className="h-4 w-4" strokeWidth={1.7} />}
          >
            Informe fiscal {taxYear}
          </Button>
          <span className="font-text text-graphite" style={{ fontSize: 13 }}>
            Historial completo o resumen de gastos deducibles del año.
          </span>
        </div>
      </section>

      {/* Danger zone */}
      {selectedVehicle.role === 'owner' && (
        <section className="bg-snow border border-silver-mist rounded-[28px] p-7">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" style={{ color: '#b64400' }} strokeWidth={1.6} />
            </div>
            <div className="flex-1">
              <h3
                className="font-display text-ink"
                style={{
                  fontWeight: 600,
                  fontSize: 20,
                  lineHeight: 1.2,
                  letterSpacing: '-0.2px',
                }}
              >
                Zona peligrosa
              </h3>
              <p
                className="font-text text-graphite mt-2 mb-4 max-w-xl"
                style={{ fontSize: 15, lineHeight: 1.45 }}
              >
                Eliminar el vehículo borrará permanentemente todos sus registros, gastos, documentos
                y accesos compartidos.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                iconLeft={<Trash2 className="h-4 w-4" strokeWidth={1.8} />}
              >
                Eliminar vehículo
              </Button>
            </div>
          </div>
        </section>
      )}

      {showEditForm && (
        <VehicleForm
          initialData={selectedVehicle}
          onSubmit={handleUpdate}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && (
        <Modal
          open
          onClose={() => setShowDeleteConfirm(false)}
          title="Eliminar vehículo"
          description={`¿Eliminar ${selectedVehicle.brand} ${selectedVehicle.model}? Esta acción no se puede deshacer.`}
          size="sm"
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} fullWidth>
                Cancelar
              </Button>
              <Button variant="danger" onClick={confirmDelete} fullWidth>
                Eliminar vehículo
              </Button>
            </div>
          }
        >
          <p className="font-text text-graphite" style={{ fontSize: 15, lineHeight: 1.5 }}>
            Se borrarán permanentemente todos los registros de mantenimiento, gastos, documentos y
            accesos compartidos de este vehículo.
          </p>
        </Modal>
      )}
    </div>
  );
};
