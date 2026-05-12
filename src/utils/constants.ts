export const MAINTENANCE_TYPES = [
  'Cambio de aceite',
  'Filtro de aire',
  'Filtro de combustible',
  'Filtro de habitáculo',
  'Frenos delanteros',
  'Frenos traseros',
  'Neumáticos',
  'Batería',
  'Bujías',
  'Correa de distribución',
  'Líquido de frenos',
  'Líquido refrigerante',
  'Revisión ITV',
  'Alineación y equilibrado',
  'Amortiguadores',
  'Embrague',
  'Dirección',
  'Suspensión',
  'Revisión general',
  'Otro',
] as const;

export const EXPENSE_CATEGORIES = [
  'Combustible',
  'Mantenimiento',
  'Reparación',
  'Seguro',
  'ITV',
  'Parking',
  'Lavado',
  'Accesorios',
  'Multas',
  'Otros',
] as const;

export const DOCUMENT_TYPES = [
  'Seguro',
  'ITV',
  'Permiso de circulación',
  'Ficha técnica',
  'Contrato de compraventa',
  'Garantía',
  'Manual de usuario',
  'Factura compra',
  'Otro',
] as const;

export const FUEL_TYPES = ['Gasolina', 'Diésel', 'Híbrido', 'Eléctrico', 'GLP', 'GNC'] as const;

export const TRANSMISSION_TYPES = ['Manual', 'Automático', 'Semi-automático', 'CVT'] as const;

export const CAR_PARTS: Record<string, { label: string; maintenanceTypes: string[] }> = {
  engine: {
    label: 'Motor',
    maintenanceTypes: ['Cambio de aceite', 'Filtro de aire', 'Filtro de combustible', 'Bujías', 'Revisión general'],
  },
  tires_front_left: {
    label: 'Neumático delantero izquierdo',
    maintenanceTypes: ['Neumáticos', 'Alineación y equilibrado'],
  },
  tires_front_right: {
    label: 'Neumático delantero derecho',
    maintenanceTypes: ['Neumáticos', 'Alineación y equilibrado'],
  },
  tires_rear_left: {
    label: 'Neumático trasero izquierdo',
    maintenanceTypes: ['Neumáticos', 'Alineación y equilibrado'],
  },
  tires_rear_right: {
    label: 'Neumático trasero derecho',
    maintenanceTypes: ['Neumáticos', 'Alineación y equilibrado'],
  },
  brakes_front: {
    label: 'Frenos delanteros',
    maintenanceTypes: ['Frenos delanteros', 'Líquido de frenos'],
  },
  brakes_rear: {
    label: 'Frenos traseros',
    maintenanceTypes: ['Frenos traseros', 'Líquido de frenos'],
  },
  battery: {
    label: 'Batería',
    maintenanceTypes: ['Batería'],
  },
  suspension: {
    label: 'Suspensión',
    maintenanceTypes: ['Suspensión', 'Amortiguadores', 'Alineación y equilibrado'],
  },
};

export const OIL_CHANGE_KM_INTERVAL = 10000;
export const OIL_CHANGE_MONTH_INTERVAL = 12;
export const GENERAL_SERVICE_KM_INTERVAL = 20000;
