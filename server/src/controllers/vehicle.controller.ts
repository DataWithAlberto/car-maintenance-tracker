import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../db/client';
import { accessService } from '../services/access.service';
import { NotFoundError } from '../utils/errors';

export const vehicleController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { data: owned } = await supabaseAdmin
        .from('vehicles').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
      const { data: shared } = await supabaseAdmin
        .from('shared_access').select('role, vehicles(*)').eq('user_id', userId).eq('status', 'accepted');

      const vehicles = [
        ...(owned ?? []).map((v) => ({ ...v, role: 'owner' as const })),
        ...(shared ?? []).filter((s) => s.vehicles).map((s) => ({ ...(s.vehicles as object), role: s.role })),
      ];
      res.json(vehicles);
    } catch (err) { next(err); }
  },

  async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireRead(req.user!.id, req.params.id);
      const { data, error } = await supabaseAdmin.from('vehicles').select('*').eq('id', req.params.id).single();
      if (error || !data) throw new NotFoundError();
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabaseAdmin
        .from('vehicles')
        .insert({ ...req.body, owner_id: req.user!.id })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireWrite(req.user!.id, req.params.id);
      const { data, error } = await supabaseAdmin
        .from('vehicles')
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
      await accessService.requireOwner(req.user!.id, req.params.id);
      const { error } = await supabaseAdmin.from('vehicles').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err) { next(err); }
  },
};
