const multer = require('multer');
const config = require('../config');
const path = require('path');
const crypto = require('crypto');

const maxUploadSizeBytes = (() => {
    if (config.maxUploadSize === null) {
        return Infinity;
    }
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
        const isVideoMimeType = file.mimetype.startsWith('video/');
        const allowedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const isVideoExtension = allowedExtensions.includes(fileExtension);

        if (isVideoMimeType || isVideoExtension) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type, only video files are permitted'), false);
        }
    }
});

module.exports = {
    uploadMiddleware: upload.single('video')
};