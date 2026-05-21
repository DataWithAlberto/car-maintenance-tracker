import { Router } from 'express';
import { sharingController } from '../controllers/sharing.controller';
import { validate } from '../middleware/validation';
import {
  requireVehicleAccess,
  requireVehicleOwner,
} from '../middleware/authorization.middleware';
import { inviteSchema } from '../utils/validators';

const router = Router();

// GET /api/sharing/me/invites  — pending invites for the current user (no vehicle scope)
// Must be declared before /:id routes to avoid route shadowing
router.get('/me/invites', sharingController.myInvites);

// GET /api/sharing/vehicle/:vehicleId  — owner only (see who has access)
router.get(
  '/vehicle/:vehicleId',
  requireVehicleAccess,
  requireVehicleOwner,
  sharingController.listByVehicle,
);

// POST /api/sharing/vehicle/:vehicleId/invite  — owner only
router.post(
  '/vehicle/:vehicleId/invite',
  requireVehicleAccess,
  requireVehicleOwner,
  validate(inviteSchema),
  sharingController.invite,
);

// POST /api/sharing/:id/respond  — the invited user accepts/rejects their own invite
router.post('/:id/respond', sharingController.respond);

// DELETE /api/sharing/:id  — owner can revoke; invited user can leave
router.delete('/:id', sharingController.remove);

export default router;
