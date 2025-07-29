const path = require('path');

const config = {
    port: process.env.PORT || 3000,
    maxUploadSize: process.env.MAX_VIDEO_UPLOAD_SIZE || '1G',
    paths: {
        uploads: path.join(__dirname, '../../uploads'),
        compressed: path.join(__dirname, '../../compressed'),
        logs: path.join(__dirname, '../../logs'),
        public: path.join(__dirname, '../../public'),
    },
    forceCpu: process.env.FORCE_CPU_ENCODER === 'true',
};

Object.values(config.paths).forEach(dirPath => {
    if (!require('fs').existsSync(dirPath)) {
        require('fs').mkdirSync(dirPath, { recursive: true });
    }
});

module.exports = config;
