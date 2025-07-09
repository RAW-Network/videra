const multer = require('multer');
const config = require('../config');
const path = require('path');
const crypto = require('crypto');

const maxUploadSizeBytes = (() => {
    const size = parseFloat(config.maxUploadSize);
    const unit = config.maxUploadSize.toUpperCase().slice(-1);
    if (unit === 'G') return size * 1024 * 1024 * 1024;
    if (unit === 'M') return size * 1024 * 1024;
    if (unit === 'K') return size * 1024;
    return size;
})();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.paths.uploads),
    filename: (req, file, cb) => {
        const randomName = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname);
        cb(null, `${randomName}${extension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: maxUploadSizeBytes },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type, only video files are permitted'), false);
        }
    }
});

module.exports = {
    uploadMiddleware: upload.single('video')
};
