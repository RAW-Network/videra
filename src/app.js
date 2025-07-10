const express = require('express');
const path = require('path');
const multer = require('multer');
const config = require('./config');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

app.use(express.static(config.paths.public));
app.use('/compressed', express.static(config.paths.compressed));

app.get('/config', (req, res) => {
    res.json({ maxUploadSize: config.maxUploadSize });
});

app.use('/api/v1', uploadRoutes);

app.use((err, req, res, next) => {
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

    const isProduction = process.env.NODE_ENV === 'production';
    res.status(500).json({ 
        error: isProduction ? 'An unexpected server error occurred' : err.message 
    });
});

module.exports = app;