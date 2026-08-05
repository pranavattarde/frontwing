import { Router } from 'express';
import { HistoryController } from '../controllers/history.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /history — get user's investigation history list
router.get('/', authenticateToken, HistoryController.getHistory);

// GET /history/:id — get specific investigation details
router.get('/:id', optionalAuth, HistoryController.getHistoryById);

// DELETE /history/:id — delete an investigation
router.delete('/:id', authenticateToken, HistoryController.deleteHistory);

// POST /history/save/:id — bookmark/save an investigation
router.post('/save/:id', authenticateToken, HistoryController.toggleSave);

export default router;
