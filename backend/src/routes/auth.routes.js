const { Router } = require('express');
const { AuthController } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticateToken, AuthController.me);

module.exports = router;
