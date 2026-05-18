import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  full_name: z.string().min(2, 'Nombre requerido'),
});

export const vehicleSchema = z.object({
  brand: z.string().min(1, 'Marca requerida'),
  model: z.string().min(1, 'Modelo requerido'),
  year: z.number().min(1990).max(new Date().getFullYear() + 1),
  license_plate: z.string().optional(),
  color: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  current_km: z.number().min(0, 'KM inválidos'),
  vin: z.string().optional(),
});

export const maintenanceSchema = z.object({
  type: z.string().min(1, 'Tipo requerido'),
  date: z.string().min(1, 'Fecha requerida'),
  km_at_service: z.number().min(0, 'KM inválidos'),
  cost: z.number().optional(),
  description: z.string().optional(),
  parts_location: z.string().optional(),
  next_service_km: z.number().optional(),
  next_service_date: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1, 'Categoría requerida'),
  date: z.string().min(1, 'Fecha requerida'),
  amount: z.number().min(0.01, 'Importe inválido'),
  description: z.string().optional(),
  receipt_url: z.string().optional(),
});

export const insuranceSchema = z
  .object({
    provider: z.string().min(1, 'Aseguradora requerida'),
    policy_number: z.string().optional(),
    coverage_type: z.enum(
      ['terceros', 'terceros_ampliado', 'todo_riesgo', 'todo_riesgo_franquicia'],
      { message: 'Cobertura requerida' },
    ),
    premium_amount: z.number().min(0, 'Importe inválido').optional(),
    payment_frequency: z
      .enum(['mensual', 'trimestral', 'semestral', 'anual'])
      .optional(),
    start_date: z.string().min(1, 'Fecha de inicio requerida'),
    end_date: z.string().min(1, 'Fecha de fin requerida'),
    deductible: z.number().min(0, 'Importe inválido').optional(),
    contact_phone: z.string().optional(),
    document_url: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: 'La fecha de fin debe ser posterior al inicio',
    path: ['end_date'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type InsuranceInput = z.infer<typeof insuranceSchema>;
