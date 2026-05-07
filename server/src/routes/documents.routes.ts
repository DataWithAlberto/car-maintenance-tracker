import { Router } from 'express';
import { documentsController } from '../controllers/documents.controller';
import { validate } from '../middleware/validation';
import { documentSchema } from '../utils/validators';

const router = Router();

router.get('/vehicle/:vehicleId', documentsController.listByVehicle);
router.post('/vehicle/:vehicleId', validate(documentSchema), documentsController.create);
router.delete('/:id', documentsController.remove);

export default router;
