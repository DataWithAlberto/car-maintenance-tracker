import { useState } from 'react';
import toast from 'react-hot-toast';
import { maintenanceService } from '../services/maintenance.service';
import { expensesService } from '../services/expenses.service';
import { documentsService } from '../services/documents.service';
import { exportService } from '../services/export.service';
import { getErrorMessage } from '../utils/errors';
import type { VehicleWithAccess } from '../types';

// Encapsula la generación de informes (PDF / fiscal) de un vehículo:
// reúne los datos necesarios y delega en exportService.
export const useVehicleExport = (vehicle: VehicleWithAccess | null) => {
  const [exporting, setExporting] = useState(false);
  const [exportingTax, setExportingTax] = useState(false);

  const exportReport = async () => {
    if (!vehicle) return;
    setExporting(true);
    try {
      const [records, expenses, documents] = await Promise.all([
        maintenanceService.getByVehicle(vehicle.id),
        expensesService.getByVehicle(vehicle.id),
        documentsService.getByVehicle(vehicle.id),
      ]);
      exportService.exportVehicleReport(vehicle, records, expenses, documents);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo generar el informe'));
    } finally {
      setExporting(false);
    }
  };

  const exportTaxReport = async (year: number) => {
    if (!vehicle) return;
    setExportingTax(true);
    try {
      const [records, expenses] = await Promise.all([
        maintenanceService.getByVehicle(vehicle.id),
        expensesService.getByVehicle(vehicle.id),
      ]);
      exportService.exportTaxReport(vehicle, expenses, records, year);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo generar el informe fiscal'));
    } finally {
      setExportingTax(false);
    }
  };

  return { exporting, exportingTax, exportReport, exportTaxReport };
};
