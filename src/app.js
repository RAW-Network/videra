const express = require('express');
const config = require('./config');
const uploadRoutes = require('./routes/upload.routes');
const { globalErrorHandler } = require('./middleware/error.middleware');

const app = express();

app.use(express.static(config.paths.public));
app.use('/compressed', express.static(config.paths.compressed));

app.get('/config', (req, res) => {
    res.json({ maxUploadSize: config.maxUploadSize });
});

app.use('/api/v1', uploadRoutes);

app.use(globalErrorHandler);

module.exports = app;