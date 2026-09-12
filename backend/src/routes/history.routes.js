const { Router } = require('express');
const { HistoryController } = require('../controllers/history.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');

const router = Router();

// GET /history — get user's investigation history list
router.get('/', authenticateJWT, HistoryController.getHistory);

// GET /history/bookmarks — get saved/bookmarked investigations
router.get('/bookmarks', authenticateJWT, HistoryController.getHistory);

// GET /history/:id — get specific investigation details
router.get('/:id', authenticateJWT, HistoryController.getHistoryById);

// DELETE /history/:id — delete an investigation
router.delete('/:id', authenticateJWT, HistoryController.deleteHistory);

// POST /history/save/:id — bookmark/save an investigation
router.post('/save/:id', authenticateJWT, HistoryController.toggleSave);

module.exports = router;
