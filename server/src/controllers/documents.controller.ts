import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../db/client';
import { accessService } from '../services/access.service';
import { NotFoundError } from '../utils/errors';

export const documentsController = {
  async listByVehicle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireRead(req.user!.id, req.params.vehicleId);
      const { data, error } = await supabaseAdmin
        .from('documents').select('*').eq('vehicle_id', req.params.vehicleId).order('created_at', { ascending: false });
      if (error) throw error;
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireWrite(req.user!.id, req.params.vehicleId);
      const { data, error } = await supabaseAdmin
        .from('documents')
        .insert({ ...req.body, vehicle_id: req.params.vehicleId, uploaded_by: req.user!.id })
        .select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data: doc } = await supabaseAdmin
        .from('documents').select('vehicle_id').eq('id', req.params.id).maybeSingle();
      if (!doc) throw new NotFoundError();
      // DELETE requires owner — editors cannot delete documents
      await accessService.requireOwner(req.user!.id, doc.vehicle_id);
      const { error } = await supabaseAdmin.from('documents').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err) { next(err); }
  },
};
