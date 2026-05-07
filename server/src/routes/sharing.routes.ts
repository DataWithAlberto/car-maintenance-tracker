import { Router } from 'express';
import { sharingController } from '../controllers/sharing.controller';
import { validate } from '../middleware/validation';
import { inviteSchema } from '../utils/validators';

const router = Router();

router.get('/vehicle/:vehicleId', sharingController.listByVehicle);
router.post('/vehicle/:vehicleId/invite', validate(inviteSchema), sharingController.invite);
router.post('/:id/respond', sharingController.respond);
router.delete('/:id', sharingController.remove);
router.get('/me/invites', sharingController.myInvites);

export default router;
