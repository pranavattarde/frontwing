const { Router } = require('express');
const { HistoryController } = require('../controllers/history.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = Router();

// GET /history — get user's investigation history list
router.get('/', authenticateToken, HistoryController.getHistory);

// GET /history/bookmarks — get saved/bookmarked investigations
router.get('/bookmarks', authenticateToken, HistoryController.getHistory);

// GET /history/:id — get specific investigation details
router.get('/:id', authenticateToken, HistoryController.getHistoryById);

// DELETE /history/:id — delete an investigation
router.delete('/:id', authenticateToken, HistoryController.deleteHistory);

// POST /history/save/:id — bookmark/save an investigation
router.post('/save/:id', authenticateToken, HistoryController.toggleSave);

module.exports = router;
