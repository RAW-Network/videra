const { Router } = require('express');
const { handleUpload, handleStream } = require('../controllers/upload.controller');
const { uploadMiddleware } = require('../middleware/upload.middleware');

const router = Router();

router.post('/upload', uploadMiddleware, handleUpload);
router.get('/stream/:jobId', handleStream);

module.exports = router;
