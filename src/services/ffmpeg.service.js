const { spawn } = require('child_process');
const path = require('path');
const fsp = require('fs/promises');
const crypto = require('crypto');
const os = require('os');
const config = require('../config');

function sanitizeFilename(originalName, fallbackName = 'video') {
    const extension = (path.extname(originalName) || '.mp4').toLowerCase();
    let baseName = path.basename(originalName, extension);
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9 _-]/g, '');
    const finalBase = sanitizedBase.replace(/\s+/g, '_').slice(0, 100);

    if (!finalBase) {
        return `${fallbackName}${extension}`;
    }

    return `${finalBase}_videra-compress${extension}`;
}

const jobs = {};

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
            try {
                const { id, targetSizeMB, totalDuration, inputPath, originalName } = job;
                const audioBitrate = 128;
                const targetSizeBytes = targetSizeMB * 1024 * 1024;
                const totalBitrate = (targetSizeBytes * 8) / (totalDuration * 1024);
                const videoBitrate = Math.floor(totalBitrate - audioBitrate);

                if (videoBitrate <= 0) {
                    throw new Error(`Target size of ${targetSizeMB}MB is too small for a video of this duration`);
                }

                const nullDevice = os.platform() === 'win32' ? 'NUL' : '/dev/null';
                const passlogPrefix = path.join(config.paths.logs, id);
                const outputFilename = sanitizeFilename(originalName, id);
                const outputPath = path.join(config.paths.compressed, outputFilename);

                const baseArgs = ['-i', inputPath];
                if (encoderSettings.hwaccel === 'vaapi') {
                    baseArgs.unshift('-vaapi_device', '/dev/dri/renderD128', '-hwaccel', 'vaapi', '-hwaccel_output_format', 'vaapi');
                }

                const pass1Args = [ ...baseArgs, '-c:v', encoderSettings.codec, '-b:v', `${videoBitrate}k`, '-pass', '1', '-passlogfile', passlogPrefix, '-an', '-f', 'mp4', '-y', nullDevice ];
                const pass2Args = [ ...baseArgs, '-c:v', encoderSettings.codec, '-b:v', `${videoBitrate}k`, '-pass', '2', '-passlogfile', passlogPrefix, '-c:a', 'aac', '-b:a', `${audioBitrate}k`, '-y', outputPath ];

                console.log(`[Job Progress] ID: ${id}, Starting Pass 1`);
                sendEvent({ type: 'progress', value: 0, text: 'Analyzing - Pass 1 of 2' });
                await runFfmpeg(pass1Args, job, sendEvent);

                if (!jobs[id]) return reject(new Error("Job was cancelled during pass 1"));

                console.log(`[Job Progress] ID: ${id}, Starting Pass 2`);
                sendEvent({ type: 'progress', value: 50, text: 'Compressing - Pass 2 of 2' });
                await runFfmpeg(pass2Args, job, sendEvent, 50);

                console.log(`[Job Success] ID: ${id}, Compression finished`);
                sendEvent({ type: 'progress', value: 100, text: 'Finalizing...' });
                sendEvent({ type: 'done', downloadUrl: `/compressed/${outputFilename}` });

                setTimeout(() => {
                    console.log(`[Auto Cleanup] Deletion for job ${id} scheduled in 1 hour: ${outputFilename}`);
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

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    };

    return { job, runCompression };
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

function runFfmpeg(args, job, sendEvent, progressOffset = 0) {
    return new Promise((resolve, reject) => {
        console.log(`[FFmpeg] Job ${job.id} spawning command: ffmpeg ${args.join(' ')}`);

        const ffmpegArgs = ['-progress', 'pipe:2', ...args];
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);

        job.ffmpegProcess = ffmpeg;

        let stderrOutput = '';
        let lastProgress = -1;

        ffmpeg.stderr.on('data', (data) => {
            stderrOutput += data.toString();

            const progressMatch = stderrOutput.match(/frame=\s*([0-9]+)/g);
            if (progressMatch && job.totalFrames > 0) {
                const lastFrameMatch = progressMatch[progressMatch.length - 1];
                const currentFrame = parseInt(lastFrameMatch.split('=')[1].trim(), 10);
                const passProgress = Math.min(100, (currentFrame / job.totalFrames) * 100);
                const totalProgress = Math.round(progressOffset + (passProgress / 2));

                if (totalProgress > lastProgress) {
                    lastProgress = totalProgress;
                    sendEvent({ type: 'progress', value: totalProgress, text: 'Processing' });
                }
            }
        });

        ffmpeg.on('close', (code) => {
            job.ffmpegProcess = null;
            if (code === 0) {
                console.log(`[FFmpeg] Job ${job.id} process completed successfully`);
                resolve();
            } else {
                console.error(`[FFmpeg] Job ${job.id} process exited with code ${code}`);
                console.error(`[FFmpeg] Stderr: ${stderrOutput}`);
                reject(new Error('Compression process failed, check server logs for details'));
            }
        });

        ffmpeg.on('error', (err) => {
            job.ffmpegProcess = null;
            console.error(`[FFmpeg] Failed to start process for job ${job.id}:`, err);
            reject(new Error(`Failed to start the compression process: ${err.message}`));
        });
    });
}

module.exports = { createCompressionJob, getJobStream, cleanupJob };