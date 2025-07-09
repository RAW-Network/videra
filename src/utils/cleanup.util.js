const fsp = require('fs/promises');
const path = require('path');
const config = require('../config');

async function cleanupDirectoryOnBoot(directoryPath, directoryName) {
    console.log(`[Startup Cleanup] Cleaning ${directoryName} directory`);
    try {
        const files = await fsp.readdir(directoryPath);
        if (files.length === 0) {
            console.log(`[Startup Cleanup] No files to clean in ${directoryName} directory`);
            return;
        }
        
        let deletedCount = 0;
        for (const file of files) {
            if (file.startsWith('.')) continue;
            
            const filePath = path.join(directoryPath, file);
            await fsp.unlink(filePath);
            deletedCount++;
        }
        
        if (deletedCount > 0) {
            console.log(`[Startup Cleanup] Successfully deleted ${deletedCount} file(s) from ${directoryName} directory`);
        } else {
            console.log(`[Startup Cleanup] No files needed cleaning in ${directoryName} directory`);
        }

    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error(`[Startup Cleanup] Error cleaning ${directoryName} directory:`, error);
        }
    }
}

module.exports = { cleanupDirectoryOnBoot };
