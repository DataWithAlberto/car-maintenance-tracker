import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller';
import { validate } from '../middleware/validation';
import {
  requireVehicleAccess,
  requireVehicleEdit,
} from '../middleware/authorization.middleware';
import { documentSchema } from '../utils/validators';

const router = Router();

// GET /api/documents/vehicle/:vehicleId  — owner | editor | viewer
router.get(
  '/vehicle/:vehicleId',
  requireVehicleAccess,
  documentsController.listByVehicle,
);

// POST /api/documents/vehicle/:vehicleId  — owner | editor
router.post(
  '/vehicle/:vehicleId',
  requireVehicleAccess,
  requireVehicleEdit,
  validate(documentSchema),
  documentsController.create,
);

// DELETE /api/documents/:id  — owner only
// vehicleId resolved from record inside controller
router.delete('/:id', documentsController.remove);

export default router;
