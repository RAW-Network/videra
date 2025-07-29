const fsp = require('fs/promises');
const path = require('path');

async function cleanupDirectoryOnBoot(directoryPath, directoryName) {
    console.log(`[Startup Cleanup] Cleaning ${directoryName} directory`);
    try {
        const items = await fsp.readdir(directoryPath);
        if (items.length === 0) {
            console.log(`[Startup Cleanup] No items to clean in ${directoryName} directory`);
            return;
        }

        let deletedCount = 0;
        for (const item of items) {
            if (item.startsWith('.')) continue;

            const itemPath = path.join(directoryPath, item);
            const stats = await fsp.stat(itemPath);

            if (stats.isDirectory()) {
                await fsp.rm(itemPath, { recursive: true, force: true });
            } else {
                await fsp.unlink(itemPath);
            }

            deletedCount++;
        }

        if (deletedCount > 0) {
            console.log(`[Startup Cleanup] Successfully cleaned ${deletedCount} item(s) from ${directoryName} directory`);
        } else {
            console.log(`[Startup Cleanup] No items needed cleaning in ${directoryName} directory`);
        }

    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`[Startup Cleanup] Error cleaning ${directoryName} directory:`, error);
        }
    }
}

module.exports = { cleanupDirectoryOnBoot };