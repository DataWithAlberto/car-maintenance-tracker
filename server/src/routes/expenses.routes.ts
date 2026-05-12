import { Router } from 'express';
import { expensesController } from '../controllers/expenses.controller';
import { validate } from '../middleware/validation';
import {
  requireVehicleAccess,
  requireVehicleEdit,
} from '../middleware/authorization.middleware';
import { expenseSchema } from '../utils/validators';

const router = Router();

// GET /api/expenses/vehicle/:vehicleId  — owner | editor | viewer
router.get(
  '/vehicle/:vehicleId',
  requireVehicleAccess,
  expensesController.listByVehicle,
);

// POST /api/expenses/vehicle/:vehicleId  — owner | editor
router.post(
  '/vehicle/:vehicleId',
  requireVehicleAccess,
  requireVehicleEdit,
  validate(expenseSchema),
  expensesController.create,
);

// DELETE /api/expenses/:id  — owner only
// vehicleId resolved from record inside controller
router.delete('/:id', expensesController.remove);

export default router;
