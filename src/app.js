const express = require('express');
const config = require('./config');
const uploadRoutes = require('./routes/upload.routes');
const { globalErrorHandler } = require('./middleware/error.middleware');

const app = express();

/** Serve frontend from public folder */
app.use(express.static(config.paths.public));

/** Serve compressed video files for download */
app.use('/compressed', express.static(config.paths.compressed));

app.get('/config', (req, res) => {
    res.json({ maxUploadSize: config.maxUploadSize });
});

app.use('/api/v1', uploadRoutes);

/** Catch-all error handler */
app.use(globalErrorHandler);

module.exports = app;