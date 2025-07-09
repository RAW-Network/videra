const { createCompressionJob, getJobStream, cleanupJob } = require('../services/ffmpeg.service');
const { exec } = require('child_process');

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
        const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
        const totalDuration = parseFloat(await new Promise((resolve, reject) => {
            exec(durationCmd, (err, stdout) => err ? reject(new Error('Failed to analyze video duration')) : resolve(stdout));
        }));

        if (isNaN(totalDuration) || totalDuration <= 0) {
            throw new Error('Could not determine a valid video duration');
        }

        const jobData = {
            inputPath,
            totalDuration,
            targetSizeMB,
            originalName: req.file.originalname,
        };

        const jobId = createCompressionJob(jobData);
        console.log(`[Job Created] ID: ${jobId}, File: ${req.file.originalname}, Target Size: ${targetSizeMB}MB`);
        res.status(200).json({ jobId });

    } catch (err) {
        console.error('[Upload Error]', err.message);
        await require('fs/promises').unlink(req.file.path).catch(e => console.error("[File Cleanup Error]", e));
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

module.exports = { handleUpload, handleStream };
