const { Router } = require('express');
const { AuthController } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rate_limit.middleware');
const { validateBody, registerSchema, loginSchema } = require('../middleware/validation.middleware');

const router = Router();

router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.get('/me', authenticateToken, AuthController.me);

module.exports = router;
