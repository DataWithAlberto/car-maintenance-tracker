import type { Achievement, MaintenanceRecord, Expense, Trip, Document, VehicleWithAccess, InsurancePolicy } from '../types';

interface AchievementInput {
  vehicles: VehicleWithAccess[];
  records: MaintenanceRecord[];
  expenses: Expense[];
  trips: Trip[];
  documents: Document[];
  policies: InsurancePolicy[];
  hasSharedVehicle: boolean;
}

export function calculateAchievements(input: AchievementInput): Achievement[] {
  const { vehicles, records, expenses, trips, documents, policies, hasSharedVehicle } = input;

  const totalTripKm = trips.reduce((s, t) => s + (t.total_km ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    + records.reduce((s, r) => s + (r.cost ?? 0), 0);

  const thisYear = new Date().getFullYear();
  const recordsThisYear = records.filter((r) => new Date(r.date).getFullYear() === thisYear);

  const achievements: Achievement[] = [
    {
      id: 'first_vehicle',
      title: 'Guardagaraje',
      description: 'Registraste tu primer vehículo.',
      icon: '🚗',
      category: 'especial',
      unlocked: vehicles.length >= 1,
      xp: 100,
    },
    {
      id: 'first_maintenance',
      title: 'Primer servicio',
      description: 'Añadiste tu primer registro de mantenimiento.',
      icon: '🔧',
      category: 'mantenimiento',
      unlocked: records.length >= 1,
      xp: 50,
    },
    {
      id: '10_maintenance',
      title: 'Mecánico dedicado',
      description: 'Llevas 10 registros de mantenimiento.',
      icon: '🏆',
      category: 'mantenimiento',
      unlocked: records.length >= 10,
      progress: Math.min(records.length, 10),
      target: 10,
      xp: 200,
    },
    {
      id: '25_maintenance',
      title: 'Maestro del taller',
      description: '25 registros de mantenimiento. El coche te lo agradece.',
      icon: '⭐',
      category: 'mantenimiento',
      unlocked: records.length >= 25,
      progress: Math.min(records.length, 25),
      target: 25,
      xp: 500,
    },
    {
      id: 'first_trip',
      title: 'Primera salida',
      description: 'Registraste tu primer viaje.',
      icon: '🛣️',
      category: 'viajes',
      unlocked: trips.length >= 1,
      xp: 50,
    },
    {
      id: '1000km_trips',
      title: 'Viajero',
      description: '1.000 km registrados en viajes.',
      icon: '🗺️',
      category: 'viajes',
      unlocked: totalTripKm >= 1000,
      progress: Math.min(Math.round(totalTripKm), 1000),
      target: 1000,
      xp: 150,
    },
    {
      id: '10000km_trips',
      title: 'Trotamundos',
      description: '10.000 km de viajes registrados.',
      icon: '✈️',
      category: 'viajes',
      unlocked: totalTripKm >= 10000,
      progress: Math.min(Math.round(totalTripKm), 10000),
      target: 10000,
      xp: 400,
    },
    {
      id: 'first_expense',
      title: 'Control de gastos',
      description: 'Añadiste tu primer gasto.',
      icon: '💰',
      category: 'economia',
      unlocked: expenses.length >= 1,
      xp: 50,
    },
    {
      id: '500eur_tracked',
      title: 'Contador serio',
      description: 'Llevas más de 500€ de gastos registrados.',
      icon: '📊',
      category: 'economia',
      unlocked: totalExpenses >= 500,
      xp: 100,
    },
    {
      id: 'annual_review',
      title: 'Revisión anual',
      description: `Registraste ${recordsThisYear.length} mantenimientos este año.`,
      icon: '📅',
      category: 'mantenimiento',
      unlocked: recordsThisYear.length >= 3,
      progress: Math.min(recordsThisYear.length, 3),
      target: 3,
      xp: 200,
    },
    {
      id: 'first_document',
      title: 'Todo en regla',
      description: 'Subiste tu primer documento al coche.',
      icon: '📄',
      category: 'especial',
      unlocked: documents.length >= 1,
      xp: 50,
    },
    {
      id: 'full_docs',
      title: 'Archivo completo',
      description: '5 o más documentos subidos.',
      icon: '🗂️',
      category: 'especial',
      unlocked: documents.length >= 5,
      progress: Math.min(documents.length, 5),
      target: 5,
      xp: 150,
    },
    {
      id: 'insured',
      title: 'Bien asegurado',
      description: 'Registraste tu póliza de seguro.',
      icon: '🛡️',
      category: 'economia',
      unlocked: policies.length >= 1,
      xp: 100,
    },
    {
      id: 'shared_vehicle',
      title: 'Compartidor',
      description: 'Compartiste un vehículo con otro usuario.',
      icon: '🤝',
      category: 'social',
      unlocked: hasSharedVehicle,
      xp: 150,
    },
    {
      id: 'multi_vehicle',
      title: 'Flota propia',
      description: 'Tienes más de un vehículo registrado.',
      icon: '🚙',
      category: 'especial',
      unlocked: vehicles.length >= 2,
      xp: 200,
    },
    {
      id: '10_trips',
      title: 'Explorador',
      description: '10 viajes registrados.',
      icon: '🧭',
      category: 'viajes',
      unlocked: trips.length >= 10,
      progress: Math.min(trips.length, 10),
      target: 10,
      xp: 200,
    },
  ];

  return achievements;
}

export function totalXP(achievements: Achievement[]): number {
  return achievements.filter((a) => a.unlocked).reduce((s, a) => s + a.xp, 0);
}

export function xpLevel(xp: number): { level: number; title: string; nextLevelXp: number } {
  const thresholds = [0, 100, 300, 600, 1000, 1600, 2400, 3500, 5000];
  const titles = [
    'Novato', 'Aprendiz', 'Conductor', 'Mecánico', 'Experto',
    'Maestro', 'Leyenda', 'Campeón', 'Élite',
  ];
  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i;
  }
  return {
    level: level + 1,
    title: titles[level],
    nextLevelXp: thresholds[level + 1] ?? thresholds[thresholds.length - 1],
  };
}
