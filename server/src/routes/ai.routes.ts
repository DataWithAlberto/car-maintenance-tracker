import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';

const router = Router();

router.post('/diagnose', aiController.diagnose);
router.post('/receipt', aiController.receipt);
router.post('/maintenance-insights', aiController.maintenanceInsights);

export default router;
