const path = require('path');
const fsp = require('fs/promises');
const crypto = require('crypto');
const config = require('../config');
const jobs = require('../storage/job.store');
const { buildFfmpegArgs } = require('./ffmpeg.args');
const { runFfmpeg } = require('./ffmpeg.runner');

function createCompressionJob(jobData) {
    const jobId = crypto.randomBytes(16).toString('hex');
    jobs[jobId] = {
        id: jobId,
        status: 'pending',
        ffmpegProcess: null,
        ...jobData,
    };
    return jobId;
}

function getJobStream(jobId) {
    const job = jobs[jobId];
    if (!job || job.status !== 'pending') {
        return { job: null };
    }
    job.status = 'processing';
    console.log(`[Job Started] ID: ${job.id}`);

    const runCompression = (encoderSettings, sendEvent) => {
        return new Promise(async (resolve, reject) => {
            let jobArgs;
            try {
                jobArgs = buildFfmpegArgs(job, encoderSettings);
                const { pass1Args, pass2Args, outputFilename, outputPath } = jobArgs;

                console.log(`[Job Progress] ID: ${job.id}, Starting Pass 1`);
                await runFfmpeg(pass1Args, job, sendEvent, 0, 'Analyzing - Pass 1 of 2');

                if (!jobs[job.id]) return reject(new Error("Job was cancelled during pass 1"));

                console.log(`[Job Progress] ID: ${job.id}, Starting Pass 2`);
                await runFfmpeg(pass2Args, job, sendEvent, 50, 'Compressing - Pass 2 of 2');

                console.log(`[Job Success] ID: ${job.id}, Compression finished`);
                sendEvent({ type: 'progress', value: 100, text: 'Finalizing...' });
                sendEvent({ type: 'done', downloadUrl: `/compressed/${outputFilename}` });

                scheduleAutoCleanup(outputPath, job.id, outputFilename);
                resolve();

            } catch (error) {
                reject(error);
            }
        });
    };

    return { job, runCompression };
}

function scheduleAutoCleanup(outputPath, jobId, outputFilename) {
    setTimeout(() => {
        console.log(`[Auto Cleanup] Deletion for job ${jobId} scheduled in 1 hour: ${outputFilename}`);
        fsp.unlink(outputPath)
            .then(() => {
                console.log(`[Auto Cleanup] Successfully deleted ${outputFilename} after 1 hour`);
            })
            .catch(e => {
                if (e.code !== 'ENOENT') {
                    console.error(`[Auto Cleanup Error] Failed to delete ${outputFilename}:`, e);
                }
            });
    }, 3600 * 1000);
}

async function cleanupJob(jobId) {
    const currentJob = jobs[jobId];
    if (!currentJob || currentJob.status === 'cleaning') {
        return;
    }

    currentJob.status = 'cleaning';
    console.log(`[Job Cleanup] Starting cleanup for job ${jobId}`);

    const logPrefix = path.join(config.paths.logs, jobId);
    const logFile = `${logPrefix}-0.log`;
    const mbtreeFile = `${logPrefix}-0.log.mbtree`;

    try {
        await fsp.unlink(logFile).catch(() => {});
        await fsp.unlink(mbtreeFile).catch(() => {});
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`[Job Cleanup] Error cleaning log files for job ${jobId}:`, error);
        }
    }

    fsp.unlink(currentJob.inputPath).catch(() => {});

    if (currentJob.ffmpegProcess) {
        currentJob.ffmpegProcess.kill('SIGKILL');
    }

    delete jobs[jobId];
    console.log(`[Job Cleanup] Resources cleaned up for job ${jobId}`);
}

module.exports = { createCompressionJob, getJobStream, cleanupJob };