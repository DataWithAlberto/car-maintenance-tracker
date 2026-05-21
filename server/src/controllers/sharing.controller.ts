import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabaseAdmin } from '../db/client';
import { accessService } from '../services/access.service';
import { NotFoundError, ValidationError } from '../utils/errors';

export const sharingController = {
  async listByVehicle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireOwner(req.user!.id, req.params.vehicleId);
      const { data, error } = await supabaseAdmin
        .from('shared_access')
        .select('*, users(*)')
        .eq('vehicle_id', req.params.vehicleId);
      if (error) throw error;
      res.json(data);
    } catch (err) { next(err); }
  },

  async invite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await accessService.requireOwner(req.user!.id, req.params.vehicleId);
      const { email, role } = req.body as { email: string; role: 'editor' | 'viewer' };

      const { data: target } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
      if (!target) throw new ValidationError('User not found. They must register first.');

      const { data, error } = await supabaseAdmin
        .from('shared_access')
        .upsert(
          { vehicle_id: req.params.vehicleId, user_id: target.id, role, status: 'pending' },
          { onConflict: 'vehicle_id,user_id' },
        )
        .select().single();
      if (error) throw error;
      res.status(201).json(data);
    } catch (err) { next(err); }
  },

  async respond(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { accept } = req.body as { accept: boolean };
      const { data: invite } = await supabaseAdmin
        .from('shared_access').select('user_id').eq('id', req.params.id).maybeSingle();
      if (!invite) throw new NotFoundError();
      if (invite.user_id !== req.user!.id) throw new ValidationError('Not your invite');

      const { data, error } = await supabaseAdmin
        .from('shared_access')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', req.params.id)
        .select().single();
      if (error) throw error;
      res.json(data);
    } catch (err) { next(err); }
  },

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data: acc } = await supabaseAdmin
        .from('shared_access').select('vehicle_id, user_id').eq('id', req.params.id).maybeSingle();
      if (!acc) throw new NotFoundError();

      // Allow owner to revoke, or user to remove their own access
      if (acc.user_id !== req.user!.id) {
        await accessService.requireOwner(req.user!.id, acc.vehicle_id);
      }

      const { error } = await supabaseAdmin.from('shared_access').delete().eq('id', req.params.id);
      if (error) throw error;
      res.status(204).end();
    } catch (err) { next(err); }
  },

  async myInvites(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabaseAdmin
        .from('shared_access')
        .select('*, vehicles(brand, model, year)')
        .eq('user_id', req.user!.id)
        .eq('status', 'pending');
      if (error) throw error;
      res.json(data);
    } catch (err) { next(err); }
  },
};
