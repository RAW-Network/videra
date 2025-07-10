const { spawn } = require('child_process');
const os = require('os');
const config = require('../config');

function getGpuVendor() {
    return new Promise((resolve) => {
        const platform = os.platform();
        let command, args;

        if (platform === 'win32') {
            command = 'powershell';
            args = ['-command', "Get-CimInstance -ClassName Win32_VideoController | Select-Object -ExpandProperty Name"];
        } else if (platform === 'linux') {
            command = 'lspci';
            args = ['-i', 'vga'];
        } else {
            return resolve(null);
        }

        const proc = spawn(command, args);
        let stdout = '';
        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.on('close', () => {
             if (!stdout) {
                console.log('[GPU Vendor] Command to detect GPU failed');
                return resolve(null);
            }
            const output = stdout.toLowerCase();
            if (output.includes('nvidia')) return resolve('NVIDIA');
            if (output.includes('amd') || output.includes('radeon')) return resolve('AMD');
            if (output.includes('intel')) return resolve('INTEL');
            resolve(null);
        });
        proc.on('error', () => resolve(null));
    });
}

function getFfmpegEncoders() {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-encoders']);
        let stdout = '';
        ffmpeg.stdout.on('data', (data) => stdout += data.toString());
        ffmpeg.on('close', (code) => {
            if (code !== 0) {
                 return reject(new Error('ffmpeg -encoders command failed'));
            }
            resolve(stdout);
        });
        ffmpeg.on('error', (err) => reject(new Error(`Failed to start ffmpeg: ${err.message}`)));
    });
}

async function detectGpuAndEncoder() {
    if (config.forceCpu) {
        console.log('[Encoder Detection] FORCE_CPU_ENCODER is active, using CPU');
        return { codec: 'libx264', hwaccel: null, type: 'CPU (Forced)' };
    }

    console.log('[Encoder Detection] Attempting to detect hardware acceleration...');
    const vendor = await getGpuVendor();
    if (!vendor) {
        console.log('[Encoder Detection] No GPU vendor detected, falling back to CPU');
        return { codec: 'libx264', hwaccel: null, type: 'CPU' };
    }

    try {
        const ffmpegEncoders = await getFfmpegEncoders();
        const platform = os.platform();

        if (vendor === 'NVIDIA' && ffmpegEncoders.includes('h264_nvenc')) {
            console.log("[Encoder Detection] Found NVIDIA GPU with 'h264_nvenc' encoder");
            return { codec: 'h264_nvenc', hwaccel: 'cuda', type: 'NVIDIA GPU' };
        }

        if (vendor === 'AMD') {
            if (platform === 'win32' && ffmpegEncoders.includes('h264_amf')) {
                console.log("[Encoder Detection] Found AMD GPU with 'h264_amf' encoder for Windows");
                return { codec: 'h264_amf', hwaccel: 'd3d11va', type: 'AMD GPU (Windows)' };
            }
            if (platform === 'linux' && ffmpegEncoders.includes('h264_vaapi')) {
                console.log("[Encoder Detection] Found AMD GPU with 'h264_vaapi' encoder for Linux");
                return { codec: 'h264_vaapi', hwaccel: 'vaapi', type: 'AMD GPU (Linux)' };
            }
        }

        if (vendor === 'INTEL') {
            if (platform === 'win32' && ffmpegEncoders.includes('h264_qsv')) {
                console.log("[Encoder Detection] Found Intel GPU with 'h264_qsv' encoder for Windows");
                return { codec: 'h264_qsv', hwaccel: 'qsv', type: 'Intel GPU (Windows)' };
            }
            if (platform === 'linux' && ffmpegEncoders.includes('h264_vaapi')) {
                console.log("[Encoder Detection] Found Intel GPU with 'h264_vaapi' encoder for Linux");
                return { codec: 'h264_vaapi', hwaccel: 'vaapi', type: 'Intel GPU (Linux)' };
            }
        }

    } catch (error) {
        console.error('[Encoder Detection] Error while checking FFmpeg encoders:', error.message);
    }

    console.log('[Encoder Detection] GPU detected, but no compatible FFmpeg encoder found. Falling back to CPU');
    return { codec: 'libx264', hwaccel: null, type: 'CPU' };
}

module.exports = { detectGpuAndEncoder };