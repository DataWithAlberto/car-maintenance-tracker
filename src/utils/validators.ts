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

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
