const { Router } = require('express');
const { SessionController } = require('../controllers/session.controller');
const { optionalAuth } = require('../middleware/auth.middleware');
const { validateBody, sessionLoadSchema } = require('../middleware/validation.middleware');

const router = Router();

router.post('/load', optionalAuth, validateBody(sessionLoadSchema), SessionController.load);
router.get('/backfill-status/:sessionId', optionalAuth, SessionController.backfillStatus);

module.exports = router;
