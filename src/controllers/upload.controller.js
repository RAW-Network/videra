const { createCompressionJob, getJobStream, cleanupJob } = require('../services/ffmpeg.service');
const { spawn } = require('child_process');
const fsp = require('fs/promises');

function getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
        const ffprobeArgs = [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'format=duration:stream=nb_frames',
            '-of', 'default=noprint_wrappers=1',
            inputPath
        ];

        const ffprobe = spawn('ffprobe', ffprobeArgs);
        let metadataOutput = '';
        let errorOutput = '';

        ffprobe.stdout.on('data', (data) => {
            metadataOutput += data.toString();
        });

        ffprobe.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        ffprobe.on('close', (code) => {
            if (code === 0) {
                try {
                    const durationMatch = metadataOutput.match(/duration=([0-9.]+)/);
                    const framesMatch = metadataOutput.match(/nb_frames=([0-9]+)/);

                    const duration = durationMatch ? parseFloat(durationMatch[1]) : NaN;
                    const totalFrames = framesMatch ? parseInt(framesMatch[1], 10) : NaN;

                    if (isNaN(duration) || duration <= 0 || isNaN(totalFrames) || totalFrames <= 0) {
                        reject(new Error('Could not determine valid video metadata (duration or frames).'));
                    } else {
                        resolve({ duration, totalFrames });
                    }
                } catch (e) {
                     reject(new Error('Failed to parse ffprobe metadata output.'));
                }
            } else {
                reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
            }
        });

        ffprobe.on('error', (err) => {
            reject(new Error(`Failed to start ffprobe: ${err.message}`));
        });
    });
}

async function handleUpload(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file was uploaded' });
    }

    const targetSizeMB = parseFloat(req.body.maxSize);
    if (isNaN(targetSizeMB) || targetSizeMB <= 0) {
        return res.status(400).json({ error: 'Invalid target output size specified' });
    }

    try {
        const inputPath = req.file.path;
        const { duration, totalFrames } = await getVideoMetadata(inputPath);

        const jobData = {
            inputPath,
            totalDuration: duration,
            totalFrames,
            targetSizeMB,
            originalName: req.file.originalname,
        };

        const jobId = createCompressionJob(jobData);
        console.log(`[Job Created] ID: ${jobId}, File: ${req.file.originalname}, Target Size: ${targetSizeMB}MB`);
        res.status(200).json({ jobId });

    } catch (err) {
        console.error('[Upload Error]', err.message);
        if (req.file) {
            await fsp.unlink(req.file.path).catch(e => console.error("[File Cleanup Error]", e));
        }
        res.status(500).json({ error: err.message });
    }
}

function handleStream(req, res) {
    const { jobId } = req.params;
    const { job, runCompression } = getJobStream(jobId);

    if (!job) {
        return res.status(404).send('Job not found or already in progress');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (data) => {
        if (!res.finished) res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    req.on('close', () => {
        console.log(`[Connection Closed] Client for job ${jobId} disconnected, halting process`);
        cleanupJob(jobId);
        if (!res.finished) res.end();
    });

    const encoderSettings = req.app.get('encoderSettings');
    
    runCompression(encoderSettings, sendEvent)
        .catch(err => {
            console.error(`[Job Failed] ID: ${jobId}, Reason:`, err.message);
            sendEvent({ type: 'error', message: err.message });
        })
        .finally(() => {
            cleanupJob(jobId);
            if (!res.finished) res.end();
        });
}

function handleCancel(req, res) {
    const { jobId } = req.params;
    console.log(`[Job Cancel] Received request to cancel job ${jobId}`);
    
    cleanupJob(jobId);
    
    res.status(200).json({ message: 'Job cancellation requested.' });
}

module.exports = { handleUpload, handleStream, handleCancel };