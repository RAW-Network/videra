import { state } from '../state.js';
import { showView } from '../router.js';
import { showNotification } from '../notification.js';
import { formatFileSize } from '../utils.js';
import { createSettingsView } from './settings.js';
import { createDoneView } from './done.js';

const ICON_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const ICON_UPLOAD = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

export function createUploadView() {
    const html = `
    <div class="view" id="upload-view">
        <header class="view-header">
            <h1>Compress Video</h1>
            <p>Compress videos quickly without losing quality. Fast, secure, and reliable.</p>
        </header>

        <div class="features-list">
            <span>${ICON_CHECK} High Quality</span>
            <span>${ICON_CHECK} Fast & Secure</span>
            <span>${ICON_CHECK} Save Storage</span>
        </div>

        <label for="fileElem" id="drop-area" class="drop-area" tabindex="0" role="button" aria-label="Drop file or click to select">
            <div class="drop-area-content">
                <div class="drop-icon">${ICON_UPLOAD}</div>
                <p class="drop-text">Drop file or click here</p>
                <p class="drop-hint">MP4, MOV, AVI, MKV, WebM</p>
            </div>
        </label>

        <input type="file" id="fileElem" name="video" accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.flv,.wmv,video/x-matroska" class="file-input">

        <label for="fileElem" class="btn btn-primary" tabindex="0" role="button">
            <span>Upload Video</span>
        </label>
    </div>`;

    function setup() {
        const dropArea = document.getElementById('drop-area');
        const fileElem = document.getElementById('fileElem');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
            dropArea.addEventListener(evt, e => {
                e.preventDefault();
                e.stopPropagation();
                dropArea.classList.toggle('highlight', evt === 'dragenter' || evt === 'dragover');
            });
        });

        dropArea.addEventListener('drop', e => handleFile(e.dataTransfer.files));
        fileElem.addEventListener('change', e => handleFile(e.target.files));

        dropArea.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileElem.click(); }
        });
    }

    return { html, setup };
}

function handleFile(files) {
    if (files.length === 0) return;
    const file = files[0];

    if (state.maxUploadSizeBytes > 0 && state.maxUploadSizeBytes !== Infinity && file.size > state.maxUploadSizeBytes) {
        showView(createDoneView, false, `File exceeds size limit of ${state.maxUploadSizeString}`);
        return;
    }

    state.selectedFile = file;
    showView(createSettingsView);
}
