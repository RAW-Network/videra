import { state } from '../state.js';
import { showView } from '../router.js';
import { showNotification } from '../notification.js';
import { formatFileSize, escapeHTML } from '../utils.js';
import { startCompression } from '../api.js';
import { createUploadView } from './upload.js';
import { createProgressView } from './progress.js';
import { createDoneView } from './done.js';

export function createSettingsView() {
    const file = state.selectedFile;
    const fileName = escapeHTML(file.name);
    const fileSize = formatFileSize(file.size);

    const html = `
    <div class="view" id="settings-view">
        <header class="view-header">
            <h1>Compress Video</h1>
        </header>

        <div class="file-info">
            <span class="file-name">${fileName}</span>
            <span class="file-size">${fileSize}</span>
        </div>

        <div class="setting-group">
            <label for="maxSize">Target Size</label>
            <div class="input-group">
                <input type="number" id="maxSize" name="maxSize" value="50" min="1" placeholder="50">
                <span class="input-unit">MB</span>
            </div>
        </div>

        <button type="button" id="compressBtn" class="btn btn-primary">
            <span>Start Compression</span>
        </button>

        <button type="button" id="backBtn" class="btn btn-secondary">
            Choose another file
        </button>
    </div>`;

    function setup() {
        document.getElementById('compressBtn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.style.opacity = '0.7';

            const targetSize = parseFloat(document.getElementById('maxSize').value);
            if (isNaN(targetSize) || targetSize <= 0) {
                showNotification('Please enter a valid target size');
                btn.disabled = false;
                btn.style.opacity = '1';
                return;
            }

            beginCompression(targetSize);
        });

        document.getElementById('backBtn').addEventListener('click', () => {
            showView(createUploadView);
        });
    }

    return { html, setup };
}

function beginCompression(targetSize) {
    const progressAPI = showProgressAndGetAPI();

    startCompression(state.selectedFile, targetSize, {
        onUploadProgress: (percent) => progressAPI.update(percent, 'Uploading'),
        onCompressionProgress: (percent, text) => progressAPI.update(percent, text || 'Compressing'),
        onDone: (downloadUrl) => showView(createDoneView, true, '', downloadUrl),
        onError: (message) => showView(createDoneView, false, message),
    });
}

/** Renders progress view manually to retain updateProgress reference */
function showProgressAndGetAPI() {
    let updateFn = null;

    const { html, setup } = createProgressView();
    const container = document.getElementById('app-container');

    container.style.opacity = '0';
    setTimeout(() => {
        container.innerHTML = html;
        const api = setup();
        updateFn = api;
        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });
    }, 160);

    return {
        update(percent, text) {
            if (updateFn) updateFn.updateProgress(percent, text);
        }
    };
}
