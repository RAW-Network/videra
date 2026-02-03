require('dotenv').config({ quiet: true })

const app = require('./app');
const config = require('./config');
const { detectGpuAndEncoder } = require('./utils/gpu.util');
const { cleanupDirectoryOnBoot } = require('./utils/cleanup.util');

async function startServer() {
    console.log('[Server] Initializing...');
    
    await cleanupDirectoryOnBoot(config.paths.uploads, 'Uploads');
    await cleanupDirectoryOnBoot(config.paths.compressed, 'Compressed');
    await cleanupDirectoryOnBoot(config.paths.logs, 'Logs');

    const encoderSettings = await detectGpuAndEncoder();
    
    app.set('encoderSettings', encoderSettings);

    app.listen(config.port, () => {
        console.log(`\n🚀 Server successfully started and listening on port ${config.port}`);
        console.log(`   - Video Encoder: ${encoderSettings.codec} (Type: ${encoderSettings.type})`);
        const uploadSize = config.maxUploadSize === null ? 'No Limit' : config.maxUploadSize;
        console.log(`   - Max Upload Size: ${uploadSize}\n`);
    });
}

startServer();