import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/load', optionalAuth, SessionController.load);

export default router;
