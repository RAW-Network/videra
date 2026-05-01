import { state } from './state.js';
import { parseSizeToBytes } from './utils.js';

const CHUNK_SIZE = 10 * 1024 * 1024;

export async function fetchConfig() {
    try {
        const res = await fetch('/config');
        const config = await res.json();
        if (config.maxUploadSize || config.maxUploadSize === null) {
            state.maxUploadSizeString = config.maxUploadSize === null ? 'Unlimited' : config.maxUploadSize;
            state.maxUploadSizeBytes = parseSizeToBytes(config.maxUploadSize);
        }
    } catch (e) {
        console.error('Failed to fetch config:', e);
    }
}

/** Upload file in chunks → merge on server → stream compression progress via SSE */
export function startCompression(file, targetSize, callbacks) {
    const { onUploadProgress, onCompressionProgress, onDone, onError } = callbacks;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    let chunkNumber = 0;

    function uploadNextChunk() {
        if (chunkNumber >= totalChunks) {
            completeUpload();
            return;
        }

        const start = chunkNumber * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        const chunkFile = new File([chunkBlob], file.name, { type: file.type });

        const formData = new FormData();
        formData.append('video', chunkFile);
        formData.append('chunkNumber', chunkNumber);
        formData.append('totalChunks', totalChunks);
        formData.append('uploadId', uploadId);
        formData.append('originalName', file.name);

        state.currentXHR = new XMLHttpRequest();
        state.currentXHR.open('POST', '/api/v1/upload/chunk', true);

        state.currentXHR.onload = () => {
            if (state.currentXHR.status === 200) {
                chunkNumber++;
                onUploadProgress((chunkNumber / totalChunks) * 100);
                setTimeout(uploadNextChunk, 0);
            } else {
                try {
                    const err = JSON.parse(state.currentXHR.responseText);
                    onError(err.error || 'Chunk upload failed');
                } catch { onError('Unknown upload error'); }
            }
        };

        state.currentXHR.onerror = () => onError('Network error during upload');
        state.currentXHR.onabort = () => console.log('Upload aborted');
        state.currentXHR.send(formData);
    }

    function completeUpload() {
        state.currentXHR = null;
        onUploadProgress(100);

        fetch('/api/v1/upload/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ totalChunks, uploadId, originalName: file.name, targetSizeMB: targetSize }),
        })
        .then(res => res.ok ? res.json() : res.json().then(e => { throw new Error(e.error || 'Server error'); }))
        .then(data => {
            if (data.jobId) {
                state.currentJobId = data.jobId;
                connectStream(data.jobId, onCompressionProgress, onDone, onError);
            } else {
                onError(data.error || 'Failed to start compression');
            }
        })
        .catch(err => onError(`Upload finalization failed: ${err.message}`));
    }

    uploadNextChunk();
}

function connectStream(jobId, onProgress, onDone, onError) {
    state.eventSource = new EventSource(`/api/v1/stream/${jobId}`);

    state.eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'progress') {
            onProgress(data.value, data.text);
        } else if (data.type === 'done') {
            state.eventSource.close();
            state.eventSource = null;
            onDone(data.downloadUrl);
        } else if (data.type === 'error') {
            state.eventSource.close();
            state.eventSource = null;
            onError(data.message);
        }
    };

    state.eventSource.onerror = () => {
        if (state.eventSource) {
            state.eventSource.close();
            state.eventSource = null;
        }
        onError('Connection to server was lost');
    };
}

export function cancelCurrentJob() {
    if (state.eventSource) { state.eventSource.close(); state.eventSource = null; }
    if (state.currentXHR) { state.currentXHR.abort(); state.currentXHR = null; }
    if (state.currentJobId) {
        fetch(`/api/v1/jobs/${state.currentJobId}/cancel`, { method: 'POST' }).catch(() => {});
        state.currentJobId = null;
    }
}
