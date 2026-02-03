const { spawn } = require('child_process');

function runFfmpeg(args, job, sendEvent, progressOffset = 0, passText = 'Processing') {
    return new Promise((resolve, reject) => {
        console.log(`[FFmpeg] Job ${job.id} spawning command: ffmpeg ${args.join(' ')}`);

        const ffmpegArgs = ['-progress', 'pipe:2', ...args];
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);

        job.ffmpegProcess = ffmpeg;

        let stderrBuffer = '';
        let lastProgress = -1;
        const totalDuration_us = job.totalDuration * 1000000;

        sendEvent({ type: 'progress', value: progressOffset, text: passText });

        ffmpeg.stderr.on('data', (data) => {
            const chunk = stderrBuffer + data.toString();
            const lines = chunk.split('\n');
            stderrBuffer = lines.pop(); 

            let current_us = -1;

            for (const line of lines) {
                if (line.startsWith('out_time_ms=')) {
                    current_us = parseInt(line.split('=')[1], 10);
                } else if (line.startsWith('progress=end')) {
                    current_us = totalDuration_us;
                }
            }

            if (current_us !== -1 && totalDuration_us > 0) {
                const passProgress = Math.min(100, (current_us / totalDuration_us) * 100);
                const totalProgress = Math.round(progressOffset + (passProgress / 2));

                if (totalProgress > lastProgress) {
                    lastProgress = totalProgress;
                    sendEvent({ type: 'progress', value: totalProgress, text: passText });
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
                console.error(`[FFmpeg] Stderr: ${stderrBuffer}`);
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

module.exports = { runFfmpeg };