const { Router } = require('express');
const { StrategyController } = require('../controllers/strategy.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = Router();

router.post('/query', optionalAuth, StrategyController.query);

module.exports = router;
