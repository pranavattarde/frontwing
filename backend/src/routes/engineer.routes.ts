import { Router } from 'express';
import { EngineerController } from '../controllers/engineer.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/query', optionalAuth, EngineerController.query);

export default router;
