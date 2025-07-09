const { Router } = require('express');
const { handleUpload, handleStream, handleCancel } = require('../controllers/upload.controller');
const { uploadMiddleware } = require('../middleware/upload.middleware');

const router = Router();

router.post('/upload', uploadMiddleware, handleUpload);
router.get('/stream/:jobId', handleStream);
router.post('/jobs/:jobId/cancel', handleCancel);

module.exports = router;