const multer = require('multer');
const config = require('../config');

const globalErrorHandler = (err, req, res, next) => {
    console.error('[Global Error Handler]', err.message);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: `File exceeds maximum size of ${config.maxUploadSize}` });
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({ error: 'An unexpected server error occurred' });
};

module.exports = { globalErrorHandler };