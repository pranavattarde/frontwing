const { Router } = require('express');
const { StrategyController } = require('../controllers/strategy.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');

const router = Router();

router.post('/query', authenticateJWT, StrategyController.query);

module.exports = router;
