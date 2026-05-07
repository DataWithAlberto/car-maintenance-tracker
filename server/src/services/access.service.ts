import { supabaseAdmin } from '../db/client';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export type AccessLevel = 'owner' | 'editor' | 'viewer' | 'none';

export const accessService = {
  async getAccessLevel(userId: string, vehicleId: string): Promise<AccessLevel> {
    const { data: vehicle } = await supabaseAdmin
      .from('vehicles')
      .select('owner_id')
      .eq('id', vehicleId)
      .maybeSingle();

    if (!vehicle) return 'none';
    if (vehicle.owner_id === userId) return 'owner';

    const { data: shared } = await supabaseAdmin
      .from('shared_access')
      .select('role, status')
      .eq('vehicle_id', vehicleId)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (shared?.role === 'editor') return 'editor';
    if (shared?.role === 'viewer') return 'viewer';
    return 'none';
  },

  async requireRead(userId: string, vehicleId: string) {
    const level = await this.getAccessLevel(userId, vehicleId);
    if (level === 'none') throw new NotFoundError('Vehicle not found');
    return level;
  },

  async requireWrite(userId: string, vehicleId: string) {
    const level = await this.getAccessLevel(userId, vehicleId);
    if (level === 'none') throw new NotFoundError('Vehicle not found');
    if (level === 'viewer') throw new ForbiddenError('Read-only access');
    return level;
  },

  async requireOwner(userId: string, vehicleId: string) {
    const level = await this.getAccessLevel(userId, vehicleId);
    if (level === 'none') throw new NotFoundError('Vehicle not found');
    if (level !== 'owner') throw new ForbiddenError('Owner only');
    return level;
  },
};
