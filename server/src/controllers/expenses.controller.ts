import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../db/client';
import { accessService } from '../services/access.service';
import { NotFoundError } from '../utils/errors';

export const expensesController = {
  async listByVehicle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireRead(req.user!.id, req.params.vehicleId);
      const { data, error } = await supabaseAdmin
        .from('expenses').select('*').eq('vehicle_id', req.params.vehicleId).order('date', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireWrite(req.user!.id, req.params.vehicleId);
      const { data, error } = await supabaseAdmin
        .from('expenses')
        .insert({ ...req.body, vehicle_id: req.params.vehicleId, created_by: req.user!.id })
        .select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data: exp } = await supabaseAdmin
        .from('expenses').select('vehicle_id').eq('id', req.params.id).maybeSingle();
      if (!exp) throw new NotFoundError();
      // DELETE requires owner — editors cannot delete expenses
      await accessService.requireOwner(req.user!.id, exp.vehicle_id);
      const { error } = await supabaseAdmin.from('expenses').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err) { next(err); }
  },
};
