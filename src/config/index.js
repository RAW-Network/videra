const path = require('path');

const isEnvTrue = (envVar) => {
    if (!envVar) return false;
    return envVar.toLowerCase() === 'true';
};

const config = {
    port: process.env.PORT || 3000,
    maxUploadSize: process.env.MAX_VIDEO_UPLOAD_SIZE || null,
    paths: {
        uploads: path.join(__dirname, '../../uploads'),
        compressed: path.join(__dirname, '../../compressed'),
        logs: path.join(__dirname, '../../logs'),
        public: path.join(__dirname, '../../public'),
    },
    useGpu: isEnvTrue(process.env.GPU),
};

Object.values(config.paths).forEach(dirPath => {
    if (!require('fs').existsSync(dirPath)) {
        require('fs').mkdirSync(dirPath, { recursive: true });
    }
});

module.exports = config;