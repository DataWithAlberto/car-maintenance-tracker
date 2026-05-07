import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../db/client';
import { accessService } from '../services/access.service';
import { NotFoundError } from '../utils/errors';

export const maintenanceController = {
  async listByVehicle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireRead(req.user!.id, req.params.vehicleId);
      const { data, error } = await supabaseAdmin
        .from('maintenance_records')
        .select('*, maintenance_attachments(*)')
        .eq('vehicle_id', req.params.vehicleId)
        .order('date', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireWrite(req.user!.id, req.params.vehicleId);
      const { data, error } = await supabaseAdmin
        .from('maintenance_records')
        .insert({ ...req.body, vehicle_id: req.params.vehicleId, created_by: req.user!.id })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data: rec } = await supabaseAdmin
        .from('maintenance_records').select('vehicle_id').eq('id', req.params.id).maybeSingle();
      if (!rec) throw new NotFoundError();
      await accessService.requireWrite(req.user!.id, rec.vehicle_id);

      const { data, error } = await supabaseAdmin
        .from('maintenance_records')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } catch (err) { next(err); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data: rec } = await supabaseAdmin
        .from('maintenance_records').select('vehicle_id').eq('id', req.params.id).maybeSingle();
      if (!rec) throw new NotFoundError();
      await accessService.requireWrite(req.user!.id, rec.vehicle_id);

      const { error } = await supabaseAdmin.from('maintenance_records').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err) { next(err); }
  },
};
