import { state, resetState } from '../state.js';
import { showView } from '../router.js';
import { formatFileSize, escapeHTML } from '../utils.js';
import { createUploadView } from './upload.js';

const ICON_SUCCESS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_ERROR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

export function createDoneView(isSuccess, message = '', downloadUrl = '') {
    const file = state.selectedFile;
    const fileName = file ? escapeHTML(file.name) : 'video';
    const fileSize = file ? formatFileSize(file.size) : '';

    let bodyHTML = '';

    if (isSuccess) {
        bodyHTML = `
            <div class="done-icon success">${ICON_SUCCESS}</div>
            <h2 class="done-title success">Compression Complete</h2>
            <div class="file-info">
                <span class="file-name">${fileName}</span>
                <span class="file-size">Original: ${fileSize}</span>
            </div>
            <a href="${downloadUrl}" class="btn btn-primary" download id="downloadBtn">
                Download Video
            </a>`;
    } else {
        bodyHTML = `
            <div class="done-icon error">${ICON_ERROR}</div>
            <h2 class="done-title error">An Error Occurred</h2>
            <p class="done-description">${escapeHTML(message)}</p>`;
    }

    const html = `
    <div class="view" id="done-view" aria-live="polite">
        <header class="view-header">
            <h1>Compress Video</h1>
        </header>
        ${bodyHTML}
        <button type="button" id="resetBtn" class="btn btn-secondary">
            Compress another video
        </button>
    </div>`;

    function setup() {
        if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }

        if (isSuccess && downloadUrl) {
            fetchCompressedSize(downloadUrl, file);
        }

        document.getElementById('resetBtn').addEventListener('click', () => {
            resetState();
            showView(createUploadView);
        });
    }

    return { html, setup };
}

/** HEAD request to show saved % on download button */
async function fetchCompressedSize(url, originalFile) {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        const size = parseInt(res.headers.get('content-length'), 10);
        if (!size || !originalFile) return;

        const downloadBtn = document.getElementById('downloadBtn');
        if (!downloadBtn) return;

        const savedPercent = Math.round((1 - size / originalFile.size) * 100);
        if (savedPercent > 0) {
            const chip = document.createElement('span');
            chip.className = 'saved-chip';
            chip.textContent = `-${savedPercent}%`;
            downloadBtn.appendChild(chip);
        }
    } catch {}
}
