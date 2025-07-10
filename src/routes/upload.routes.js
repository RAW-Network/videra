const express = require('express');
const { Router } = require('express');
const { handleChunkUpload, handleUploadComplete, handleStream, handleCancel } = require('../controllers/upload.controller');
const { uploadMiddleware } = require('../middleware/upload.middleware');

const router = Router();

router.post('/upload/chunk', uploadMiddleware, handleChunkUpload);
router.post('/upload/complete', express.json(), handleUploadComplete);

router.get('/stream/:jobId', handleStream);
router.post('/jobs/:jobId/cancel', handleCancel);

module.exports = router;