const express = require('express');
const { GhostBattleController } = require('../controllers/ghost_battle.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const { ghostBattleLimiter } = require('../middleware/rate_limit.middleware');
const { validateBody, ghostBattleDataSchema } = require('../middleware/validation.middleware');

const router = express.Router();

// Apply optionalAuth to ghost-battle routes
router.get('/available-years', optionalAuth, GhostBattleController.getAvailableYears);
router.get('/available-gps', optionalAuth, GhostBattleController.getAvailableGPs);
router.get('/drivers-teams', optionalAuth, GhostBattleController.getDriversTeams);
router.post('/data', optionalAuth, ghostBattleLimiter, validateBody(ghostBattleDataSchema), GhostBattleController.getGhostBattleData);

module.exports = router;
