import { Router } from 'express';
import { vehicleController } from '../controllers/vehicle.controller';
import { validate } from '../middleware/validation';
import { vehicleSchema } from '../utils/validators';

const router = Router();

router.get('/', vehicleController.list);
router.get('/:id', vehicleController.get);
router.post('/', validate(vehicleSchema), vehicleController.create);
router.patch('/:id', vehicleController.update);
router.delete('/:id', vehicleController.remove);

export default router;
