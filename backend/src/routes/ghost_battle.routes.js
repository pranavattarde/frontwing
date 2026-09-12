const express = require('express');
const { GhostBattleController } = require('../controllers/ghost_battle.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply optionalAuth to ghost-battle routes
router.get('/available-years', optionalAuth, GhostBattleController.getAvailableYears);
router.get('/available-gps', optionalAuth, GhostBattleController.getAvailableGPs);
router.get('/drivers-teams', optionalAuth, GhostBattleController.getDriversTeams);
router.post('/data', optionalAuth, GhostBattleController.getGhostBattleData);

module.exports = router;
