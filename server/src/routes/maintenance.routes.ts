import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenance.controller';
import { validate } from '../middleware/validation';
import { maintenanceSchema } from '../utils/validators';

const router = Router();

router.get('/vehicle/:vehicleId', maintenanceController.listByVehicle);
router.post('/vehicle/:vehicleId', validate(maintenanceSchema), maintenanceController.create);
router.patch('/:id', maintenanceController.update);
router.delete('/:id', maintenanceController.remove);

export default router;
