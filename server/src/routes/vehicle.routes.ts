import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { validate } from '../middleware/validation';
import {
  requireVehicleAccess,
  requireVehicleOwner,
} from '../middleware/authorization.middleware';
import { vehicleSchema } from '../utils/validators';

const router = Router();

// GET /api/vehicles  — lists only vehicles the user has access to (scoped in controller)
router.get('/', vehicleController.list);

// GET /api/vehicles/:id  — owner | editor | viewer
// vehicleId comes from :id here; controller calls accessService.requireRead internally
router.get('/:id', vehicleController.get);

// POST /api/vehicles  — any authenticated user can register a vehicle (becomes owner)
router.post('/', validate(vehicleSchema), vehicleController.create);

// PATCH /api/vehicles/:id  — owner | editor
// Controller resolves vehicleId from :id and calls accessService.requireWrite
router.patch('/:id', vehicleController.update);

// DELETE /api/vehicles/:id  — owner only
// Controller resolves vehicleId from :id and calls accessService.requireOwner
router.delete('/:id', vehicleController.remove);

export default router;
