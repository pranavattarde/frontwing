const { Router } = require('express');
const { EngineerController } = require('../controllers/engineer.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');
const { queryLimiter } = require('../middleware/rate_limit.middleware');
const { validateBody, engineerQuerySchema } = require('../middleware/validation.middleware');

const router = Router();

router.post('/query', authenticateJWT, queryLimiter, validateBody(engineerQuerySchema), EngineerController.query);

module.exports = router;
