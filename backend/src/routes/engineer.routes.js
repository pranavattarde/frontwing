const { Router } = require('express');
const { EngineerController } = require('../controllers/engineer.controller');
const { authenticateJWT } = require('../middleware/auth.middleware');

const router = Router();

router.post('/query', authenticateJWT, EngineerController.query);

module.exports = router;
