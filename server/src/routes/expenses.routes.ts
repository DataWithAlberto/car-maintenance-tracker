import { Router } from 'express';
import { expensesController } from '../controllers/expenses.controller';
import { validate } from '../middleware/validation';
import { expenseSchema } from '../utils/validators';

const router = Router();

router.get('/vehicle/:vehicleId', expensesController.listByVehicle);
router.post('/vehicle/:vehicleId', validate(expenseSchema), expensesController.create);
router.delete('/:id', expensesController.remove);

export default router;
