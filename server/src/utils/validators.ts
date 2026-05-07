import { z } from 'zod';

export const vehicleSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1),
  license_plate: z.string().optional(),
  color: z.string().optional(),
  fuel_type: z.string().optional(),
  transmission: z.string().optional(),
  current_km: z.number().int().min(0),
  vin: z.string().optional(),
});

export const maintenanceSchema = z.object({
  type: z.string().min(1),
  date: z.string(),
  km_at_service: z.number().int().min(0),
  cost: z.number().optional(),
  description: z.string().optional(),
  parts_location: z.string().optional(),
  next_service_km: z.number().int().optional(),
  next_service_date: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1),
  date: z.string(),
  amount: z.number().min(0.01),
  description: z.string().optional(),
  receipt_url: z.string().url().optional(),
});

export const documentSchema = z.object({
  doc_type: z.string().min(1),
  file_url: z.string().url(),
  file_name: z.string().optional(),
  expiry_date: z.string().optional(),
  is_important: z.boolean().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['editor', 'viewer']),
});
