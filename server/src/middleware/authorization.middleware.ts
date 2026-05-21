import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { accessService, AccessLevel } from '../services/access.service';
import { ForbiddenError } from '../utils/errors';

// ── Type augmentation ─────────────────────────────────────────────────────────
// Extend AuthRequest so downstream controllers can read vehicleId / userRole
// without re-querying the DB.
declare module './auth.middleware' {
  interface AuthRequest {
    vehicleId?: string;
    userRole?: AccessLevel;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractVehicleId(req: AuthRequest): string | undefined {
  return req.params.vehicleId ?? (req.body?.vehicle_id as string | undefined);
}

// ── Middleware ────────────────────────────────────────────────────────────────

/**
 * requireVehicleAccess
 * ─────────────────────
 * Validates that the authenticated user has at least READ access to the target
 * vehicle.  Extracts vehicleId from `req.params.vehicleId` or `req.body.vehicle_id`
 * and stores both `req.vehicleId` and `req.userRole` for downstream handlers.
 *
 * Use as the first authorization guard on every vehicle-scoped route.
 */
export const requireVehicleAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const vehicleId = extractVehicleId(req);
    if (!vehicleId) {
      res.status(400).json({ error: 'Missing vehicle_id' });
      return;
    }

    // requireRead throws NotFoundError (404) when vehicle doesn't exist
    // and when user has no access at all — intentionally opaque to prevent
    // vehicle enumeration.
    const level = await accessService.requireRead(userId, vehicleId);

    req.vehicleId = vehicleId;
    req.userRole  = level;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireVehicleEdit
 * ──────────────────
 * Allows owner and editor roles.  Must be chained AFTER requireVehicleAccess
 * so that req.userRole is already populated.
 *
 * Usage:  router.post('/', requireVehicleAccess, requireVehicleEdit, handler)
 */
export const requireVehicleEdit = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.userRole || !(['owner', 'editor'] as AccessLevel[]).includes(req.userRole)) {
    next(new ForbiddenError('Editor or owner access required'));
    return;
  }
  next();
};

/**
 * requireVehicleOwner
 * ───────────────────
 * Allows only the vehicle owner.  Must be chained AFTER requireVehicleAccess.
 *
 * Usage:  router.delete('/:id', requireVehicleAccess, requireVehicleOwner, handler)
 */
export const requireVehicleOwner = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  if (req.userRole !== 'owner') {
    next(new ForbiddenError('Only vehicle owner can perform this action'));
    return;
  }
  next();
};
