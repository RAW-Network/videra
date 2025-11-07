const path = require('path');
const os = require('os');
const config = require('../config');

const AUDIO_BITRATE_K = 128;

const calculateBitrates = (targetSizeMB, durationSecs) => {
    const targetSizeBytes = targetSizeMB * 1024 * 1024;
    const totalTargetBits = targetSizeBytes * 8;

    const audioBitrate_b = AUDIO_BITRATE_K * 1000;
    const totalAudioBits = audioBitrate_b * durationSecs;

    const SAFETY_MARGIN = 0.94;
    const videoTargetBits = (totalTargetBits - totalAudioBits) * SAFETY_MARGIN;

    if (videoTargetBits <= 0) {
        throw new Error(`Target size of ${targetSizeMB}MB is too small for this video duration and audio bitrate`);
    }

    const videoBitrate_b = videoTargetBits / durationSecs;
    const videoBitrate_k = Math.floor(videoBitrate_b / 1000);

    const videoMaxBitrate_k = Math.floor(videoBitrate_k * 1.5);
    const bufsize_k = videoMaxBitrate_k * 2;

    if (videoBitrate_k <= 50) {
        throw new Error(`Target size of ${targetSizeMB}MB is too small for this video duration`);
    }

    return { videoBitrate_k, videoMaxBitrate_k, bufsize_k };
};

const getEncoderPreset = (codec) => {
    switch (codec) {
        case 'libx264':
            return ['-preset', 'medium'];
        case 'h264_nvenc':
            return ['-preset', 'p5', '-tune', 'hq'];
        case 'h264_qsv':
            return ['-preset', 'medium'];
        case 'h264_amf':
            return ['-quality', 'balanced'];
        case 'h264_vaapi':
            return [];
        default:
            return ['-preset', 'medium'];
    }
};

const buildFfmpegArgs = (job, encoderSettings) => {
    const { id, targetSizeMB, totalDuration, inputPath, originalName } = job;
    const { videoBitrate_k, videoMaxBitrate_k, bufsize_k } = calculateBitrates(targetSizeMB, totalDuration);

    const nullDevice = os.platform() === 'win32' ? 'NUL' : '/dev/null';
    const passlogPrefix = path.join(config.paths.logs, id);
    const outputFilename = sanitizeFilename(originalName, id);
    const outputPath = path.join(config.paths.compressed, outputFilename);

    const baseArgs = ['-i', inputPath];
    if (encoderSettings.hwaccel === 'vaapi') {
        baseArgs.unshift('-vaapi_device', '/dev/dri/renderD128', '-hwaccel', 'vaapi', '-hwaccel_output_format', 'vaapi');
    }

    const baseFlags = ['-v', 'quiet'];

    const videoCodecArgs = [
        '-c:v', encoderSettings.codec,
        ...getEncoderPreset(encoderSettings.codec),
        '-b:v', `${videoBitrate_k}k`,
        '-maxrate', `${videoMaxBitrate_k}k`,
        '-bufsize', `${bufsize_k}k`,
    ];

    const pass1Args = [
        ...baseFlags,
        ...baseArgs,
        ...videoCodecArgs,
        '-pass', '1',
        '-passlogfile', passlogPrefix,
        '-pix_fmt', 'yuv420p',
        '-an', '-f', 'mp4', '-y', nullDevice
    ];

    const pass2Args = [
        ...baseFlags,
        ...baseArgs,
        ...videoCodecArgs,
        '-pass', '2',
        '-passlogfile', passlogPrefix,
        '-c:a', 'aac',
        '-b:a', `${AUDIO_BITRATE_K}k`,
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-y', outputPath
    ];

    return { pass1Args, pass2Args, outputFilename, outputPath };
};

function sanitizeFilename(originalName, fallbackName = 'video') {
    const extension = (path.extname(originalName) || '.mp4').toLowerCase();
    let baseName = path.basename(originalName, extension);
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9 _-]/g, '');
    const finalBase = sanitizedBase.replace(/\s+/g, '_').slice(0, 100);

    if (!finalBase) {
        return `${fallbackName}${extension}`;
    }
    return `${finalBase}_videra${extension}`;
}

module.exports = { buildFfmpegArgs };