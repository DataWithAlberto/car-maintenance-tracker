import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, AlertTriangle, Car, LogOut, KeyRound, Sparkles, Check, FileDown } from 'lucide-react';
import { useVehicleStore } from '../store/vehicleStore';
import { useSettingsStore } from '../store/settingsStore';
import { useVehicle } from '../hooks/useVehicle';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { maintenanceService } from '../services/maintenance.service';
import { expensesService } from '../services/expenses.service';
import { documentsService } from '../services/documents.service';
import { exportService } from '../services/export.service';
import { VehicleForm } from '../components/vehicle/VehicleForm';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { FloatingInput } from '../components/ui/FloatingInput';
import { formatKm } from '../utils/formatters';
import toast from 'react-hot-toast';

export const SettingsPage = () => {
  const { selectedVehicle } = useVehicleStore();
  const { updateVehicle, deleteVehicle } = useVehicle();
  const { logout, user } = useAuth();
  const { anthropicApiKey, setAnthropicApiKey, clearAnthropicApiKey } = useSettingsStore();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(anthropicApiKey);
  const [nameDraft, setNameDraft] = useState(
    (user?.user_metadata?.full_name as string | undefined) ?? ''
  );
  const [savingName, setSavingName] = useState(false);

  const [exporting, setExporting] = useState(false);

  const handleSaveName = async () => {
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameDraft.trim() } });
    setSavingName(false);
    if (error) { toast.error('No se pudo guardar el nombre'); return; }
    toast.success('Nombre actualizado');
  };

  const handleExportReport = async () => {
    if (!selectedVehicle) return;
    setExporting(true);
    try {
      const [records, expenses, documents] = await Promise.all([
        maintenanceService.getByVehicle(selectedVehicle.id),
        expensesService.getByVehicle(selectedVehicle.id),
        documentsService.getByVehicle(selectedVehicle.id),
      ]);
      exportService.exportVehicleReport(selectedVehicle, records, expenses, documents);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el informe');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveApiKey = () => {
    setAnthropicApiKey(apiKeyDraft.trim());
    toast.success(apiKeyDraft.trim() ? 'API key guardada' : 'API key eliminada');
  };

  const handleClearApiKey = () => {
    clearAnthropicApiKey();
    setApiKeyDraft('');
    toast.success('API key eliminada');
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

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedVehicle.brand} ${selectedVehicle.model}? Esta acción no se puede deshacer.`)) return;
    await deleteVehicle(selectedVehicle.id);
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
              (user?.user_metadata?.full_name as string | undefined)?.trim()?.[0]
              ?? user?.email?.[0]
              ?? 'U'
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
            disabled={nameDraft.trim() === ((user?.user_metadata?.full_name as string | undefined) ?? '')}
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
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-[12px] bg-fog flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-graphite" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-display text-ink"
              style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px' }}
            >
              API key de Claude
            </p>
            <p
              className="font-text text-graphite mt-2 mb-4 max-w-xl"
              style={{ fontSize: 15, lineHeight: 1.45 }}
            >
              Necesaria para el diagnóstico de Talleres IA. Obtén tu clave en{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-azure"
              >
                console.anthropic.com
              </a>
              . Se guarda solo en este navegador.
            </p>

            <FloatingInput
              label="API key (sk-ant-…)"
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
                disabled={apiKeyDraft.trim() === anthropicApiKey}
                iconLeft={<Check className="h-4 w-4" strokeWidth={1.8} />}
              >
                Guardar
              </Button>
              {anthropicApiKey && (
                <Button variant="secondary" size="sm" onClick={handleClearApiKey}>
                  Eliminar clave
                </Button>
              )}
              {anthropicApiKey && (
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
              Nota: la clave se usa desde el navegador. No la compartas y revócala si
              sospechas que se ha filtrado.
            </p>
          </div>
        </div>
      </section>

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
            ['Kilómetros',   formatKm(selectedVehicle.current_km)],
            ['Matrícula',    selectedVehicle.license_plate ?? '—'],
            ['Color',        selectedVehicle.color ?? '—'],
            ['Combustible',  selectedVehicle.fuel_type ?? '—'],
            ['Transmisión',  selectedVehicle.transmission ?? '—'],
            ['VIN',          selectedVehicle.vin ?? '—'],
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
            onClick={handleExportReport}
            loading={exporting}
            iconLeft={<FileDown className="h-4 w-4" strokeWidth={1.7} />}
          >
            Exportar informe (PDF)
          </Button>
          <span className="font-text text-graphite" style={{ fontSize: 13 }}>
            Mantenimiento, gastos y documentos en un solo archivo.
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
                  fontWeight: 600, fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.2px',
                }}
              >
                Zona peligrosa
              </h3>
              <p
                className="font-text text-graphite mt-2 mb-4 max-w-xl"
                style={{ fontSize: 15, lineHeight: 1.45 }}
              >
                Eliminar el vehículo borrará permanentemente todos sus registros, gastos,
                documentos y accesos compartidos.
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
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
    </div>
  );
};
