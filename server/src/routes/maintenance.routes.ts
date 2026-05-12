import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenance.controller';
import { validate } from '../middleware/validation';
import {
  requireVehicleAccess,
  requireVehicleEdit,
  requireVehicleOwner,
} from '../middleware/authorization.middleware';
import { maintenanceSchema } from '../utils/validators';

const router = Router();

// GET /api/maintenance/vehicle/:vehicleId  — owner | editor | viewer
router.get(
  '/vehicle/:vehicleId',
  requireVehicleAccess,
  maintenanceController.listByVehicle,
);

// POST /api/maintenance/vehicle/:vehicleId  — owner | editor
router.post(
  '/vehicle/:vehicleId',
  requireVehicleAccess,
  requireVehicleEdit,
  validate(maintenanceSchema),
  maintenanceController.create,
);

// PATCH /api/maintenance/:id  — owner | editor
// vehicleId is resolved from the record inside the controller
router.patch('/:id', maintenanceController.update);

// DELETE /api/maintenance/:id  — owner only
// vehicleId is resolved from the record inside the controller
router.delete('/:id', maintenanceController.remove);

export default router;
