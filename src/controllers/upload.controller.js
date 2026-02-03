const path = require('path');
const fsp = require('fs/promises');
const config = require('../config');
const { createCompressionJob, getJobStream, cleanupJob } = require('../services/ffmpeg.service');
const { getVideoMetadata } = require('../services/metadata.service');

async function handleChunkUpload(req, res) {
    try {
        const { uploadId } = req.body;
        const chunkPath = req.file.path;
        
        const tempUploadDir = path.join(config.paths.uploads, uploadId);
        await fsp.mkdir(tempUploadDir, { recursive: true });

        const newChunkPath = path.join(tempUploadDir, `${req.body.chunkNumber}.chunk`);
        await fsp.rename(chunkPath, newChunkPath);

        console.log(`[Chunk Upload] Received chunk ${req.body.chunkNumber}/${req.body.totalChunks} for upload ID: ${uploadId}`);
        res.status(200).json({ message: `Chunk ${req.body.chunkNumber} received` });

    } catch (error) {
        console.error('[Chunk Upload Error]', error);
        res.status(500).json({ error: 'Failed to process chunk' });
    }
}

async function handleUploadComplete(req, res) {
    const { totalChunks, uploadId, originalName, targetSizeMB } = req.body;
    
    if (!totalChunks || !uploadId || !originalName || !targetSizeMB) {
        return res.status(400).json({ error: 'Missing required parameters for completing upload' });
    }

    const tempUploadDir = path.join(config.paths.uploads, uploadId);
    const finalFilePath = path.join(config.paths.uploads, uploadId + path.extname(originalName));

    try {
        console.log(`[Upload Complete] Starting to merge ${totalChunks} chunks for ${uploadId}`);
        
        const writeStream = require('fs').createWriteStream(finalFilePath);
        for (let i = 0; i < totalChunks; i++) {
            const chunkPath = path.join(tempUploadDir, `${i}.chunk`);
            const chunkBuffer = await fsp.readFile(chunkPath);
            writeStream.write(chunkBuffer);
            await fsp.unlink(chunkPath);
        }
        writeStream.end();

        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
        
        await fsp.rmdir(tempUploadDir);
        console.log(`[Upload Complete] File merged successfully: ${finalFilePath}`);
        
        const { duration } = await getVideoMetadata(finalFilePath);
        const jobData = {
            inputPath: finalFilePath,
            totalDuration: duration,
            totalFrames: 0,
            targetSizeMB: parseFloat(targetSizeMB),
            originalName,
        };

        const jobId = createCompressionJob(jobData);
        console.log(`[Job Created] ID: ${jobId}, File: ${originalName}, Target Size: ${targetSizeMB}MB`);
        res.status(200).json({ jobId });

    } catch (err) {
        console.error('[Upload Complete Error]', err.message);
        await fsp.rm(tempUploadDir, { recursive: true, force: true }).catch(e => console.error("[Cleanup Error]", e));
        await fsp.unlink(finalFilePath).catch(e => console.error("[Cleanup Error]", e));
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
    
    res.status(200).json({ message: 'Job cancellation requested' });
}

module.exports = { 
    handleChunkUpload,
    handleUploadComplete,
    handleStream, 
    handleCancel 
};