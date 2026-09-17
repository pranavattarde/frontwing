const { Router } = require('express');
const { HistoryController } = require('../controllers/history.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');
const {
  validateParams,
  validateBody,
  uuidParamSchema,
  groupParamSchema,
  updateInvestigationSchema,
  createGroupSchema
} = require('../middleware/validation.middleware');

const router = Router();

// GET /history — get user's investigation history list
router.get('/', authenticateJWT, HistoryController.getHistory);

// GET /history/bookmarks — get saved/bookmarked investigations
router.get('/bookmarks', authenticateJWT, HistoryController.getHistory);

// --- Groups Routes (Must precede /:id routes) ---
// GET /history/groups — get all groups for the user
router.get('/groups', authenticateJWT, HistoryController.getGroups);

// POST /history/groups — create a new group
router.post('/groups', authenticateJWT, validateBody(createGroupSchema), HistoryController.createGroup);

// DELETE /history/groups/:groupId — delete a group
router.delete('/groups/:groupId', authenticateJWT, validateParams(groupParamSchema), HistoryController.deleteGroup);

// PATCH /history/groups/:groupId — rename a group
router.patch('/groups/:groupId', authenticateJWT, validateParams(groupParamSchema), validateBody(createGroupSchema), HistoryController.renameGroup);

// --- Investigation Specific Routes ---
// GET /history/:id — get specific investigation details
router.get('/:id', authenticateJWT, validateParams(uuidParamSchema), HistoryController.getHistoryById);

// PATCH /history/:id — update an investigation (pin, rename display_title, move group_id)
router.patch('/:id', authenticateJWT, validateParams(uuidParamSchema), validateBody(updateInvestigationSchema), HistoryController.updateInvestigation);

// DELETE /history/:id — delete an investigation
router.delete('/:id', authenticateJWT, validateParams(uuidParamSchema), HistoryController.deleteHistory);

// POST /history/save/:id — bookmark/save an investigation
router.post('/save/:id', authenticateJWT, validateParams(uuidParamSchema), HistoryController.toggleSave);

module.exports = router;
