const { Router } = require('express');
const { StrategyController } = require('../controllers/strategy.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');
const { queryLimiter } = require('../middleware/rate_limit.middleware');
const { validateBody, strategyQuerySchema } = require('../middleware/validation.middleware');

const router = Router();

router.post('/query', authenticateJWT, queryLimiter, validateBody(strategyQuerySchema), StrategyController.query);

module.exports = router;
