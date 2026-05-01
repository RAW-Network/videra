export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${units[i]}`;
}

export function parseSizeToBytes(sizeStr) {
    if (sizeStr === null) return Infinity;
    const size = parseFloat(sizeStr);
    if (!sizeStr || isNaN(size)) return 0;
    const unit = sizeStr.toUpperCase().slice(-1);
    if (unit === 'G') return size * 1024 * 1024 * 1024;
    if (unit === 'M') return size * 1024 * 1024;
    if (unit === 'K') return size * 1024;
    return size;
}

export function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
