const { Router } = require('express');
const { EngineerController } = require('../controllers/engineer.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

const router = Router();

router.post('/query', optionalAuth, EngineerController.query);

module.exports = router;
