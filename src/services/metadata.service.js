const { spawn } = require('child_process');

function getVideoMetadata(inputPath) {
    return new Promise((resolve, reject) => {
        const ffprobeArgs = [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
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
                    const duration = parseFloat(metadataOutput.trim());

                    if (isNaN(duration) || duration <= 0) {
                        reject(new Error('Could not determine valid video duration'));
                    } else {
                        resolve({ duration });
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

module.exports = { getVideoMetadata };