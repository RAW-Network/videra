document.addEventListener('DOMContentLoaded', () => {
    const CHUNK_SIZE = 10 * 1024 * 1024;
    const appContainer = document.getElementById('app-container');
    const uploadViewTemplate = document.getElementById('upload-view-template');
    const settingsViewTemplate = document.getElementById('settings-view-template');
    const progressViewTemplate = document.getElementById('progress-view-template');
    const doneViewTemplate = document.getElementById('done-view-template');

    const appState = {
        selectedFile: null,
        eventSource: null,
        maxUploadSizeBytes: 0,
        maxUploadSizeString: '',
        currentXHR: null,
    };

    function showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove());
        }, duration);
    }

    function renderView(template, setupUI) {
        const content = template.content.cloneNode(true);
        appContainer.innerHTML = '';
        appContainer.appendChild(content);
        appContainer.style.animation = 'fadeIn 0.5s ease-out';
        if (setupUI) setupUI();
    }

    function setupUploadView() {
        renderView(uploadViewTemplate, () => {
            const dropArea = document.getElementById('drop-area');
            const fileElem = document.getElementById('fileElem');
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, e => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropArea.classList.toggle('highlight', eventName === 'dragenter' || eventName === 'dragover');
                });
            });
            dropArea.addEventListener('drop', e => handleFileSelect(e.dataTransfer.files));
            fileElem.addEventListener('change', e => handleFileSelect(e.target.files));
            dropArea.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileElem.click();
                }
            });
        });
    }

    function setupSettingsView() {
        renderView(settingsViewTemplate, () => {
            document.getElementById('file-info').innerHTML = `<strong>${appState.selectedFile.name}</strong> (${(appState.selectedFile.size / 1024 / 1024).toFixed(2)} MB)`;
            document.getElementById('compressBtn').addEventListener('click', e => {
                e.preventDefault();
                e.target.disabled = true;
                const targetSize = parseFloat(document.getElementById('maxSize').value);
                if (isNaN(targetSize) || targetSize <= 0) {
                    showNotification('Please enter a valid target size');
                    e.target.disabled = false;
                    return;
                }
                startCompression(targetSize);
            });
            document.getElementById('backBtn').addEventListener('click', setupUploadView);
        });
    }

    function setupProgressView(initialText = "Uploading...") {
        renderView(progressViewTemplate, () => {
            document.getElementById('progress-text').textContent = initialText;
            document.getElementById('cancelBtn').addEventListener('click', () => {
                if (appState.currentXHR) appState.currentXHR.abort();
                window.location.reload();
            });
        });
    }

    function updateProgress(percent, text) {
        const progressBarInner = document.getElementById('progress-bar-inner');
        const progressText = document.getElementById('progress-text');
        if (progressBarInner && progressText) {
            progressBarInner.style.width = `${percent}%`;
            progressText.textContent = `${text}... ${Math.round(percent)}%`;
        }
    }

    function setupDoneView(isSuccess, message, downloadUrl = null) {
        if (appState.eventSource) {
            appState.eventSource.close();
            appState.eventSource = null;
        }
        renderView(doneViewTemplate, () => {
            const doneIcon = document.querySelector('.done-icon');
            const title = document.querySelector('#done-view h2');
            const description = document.querySelector('.done-description');
            const downloadBtn = document.getElementById('downloadBtn');
            if (isSuccess) {
                doneIcon.style.color = 'var(--accent)';
                title.textContent = 'Compression Complete';
                description.innerHTML = 'Your file is ready for download<br><small>For your privacy, this file will be automatically deleted in one hour</small>';
                downloadBtn.href = downloadUrl;
                downloadBtn.style.display = 'flex';
            } else {
                doneIcon.style.color = '#f85149';
                doneIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
                title.textContent = 'An Error Occurred';
                description.textContent = message;
                downloadBtn.style.display = 'none';
            }
            document.getElementById('resetBtn').addEventListener('click', setupUploadView);
        });
    }

    function handleFileSelect(files) {
        if (files.length === 0) return;
        const file = files[0];
        if (appState.maxUploadSizeBytes > 0 && file.size > appState.maxUploadSizeBytes) {
            setupDoneView(false, `File exceeds the size limit of ${appState.maxUploadSizeString}`);
            return;
        }
        appState.selectedFile = file;
        setupSettingsView();
    }

    function startCompression(targetSize) {
        setupProgressView("Preparing to upload...");
        const file = appState.selectedFile;
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

            appState.currentXHR = new XMLHttpRequest();
            appState.currentXHR.open('POST', '/api/v1/upload/chunk', true);

            appState.currentXHR.onload = () => {
                if (appState.currentXHR.status === 200) {
                    chunkNumber++;
                    const uploadProgress = (chunkNumber / totalChunks) * 100;
                    updateProgress(uploadProgress, 'Uploading');
                    setTimeout(uploadNextChunk, 0);
                } else {
                    try {
                        const errorData = JSON.parse(appState.currentXHR.responseText);
                        setupDoneView(false, errorData.error || 'An error occurred while uploading a chunk');
                    } catch (e) {
                        setupDoneView(false, 'An unknown upload error occurred');
                    }
                }
            };
            appState.currentXHR.onerror = () => setupDoneView(false, 'A network error occurred during chunk upload');
            appState.currentXHR.onabort = () => console.log('Upload aborted');
            appState.currentXHR.send(formData);
        }

        function completeUpload() {
            appState.currentXHR = null;
            updateProgress(100, 'Finalizing upload');
            fetch('/api/v1/upload/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalChunks, uploadId, originalName: file.name, targetSizeMB: targetSize }),
            })
            .then(response => response.ok ? response.json() : response.json().then(err => { throw new Error(err.error || 'Server error') }))
            .then(data => {
                if (data.jobId) {
                    const cancelBtn = document.getElementById('cancelBtn');
                    if(cancelBtn) cancelBtn.dataset.jobId = data.jobId;
                    startProgressStream(data.jobId);
                } else {
                    setupDoneView(false, data.error || 'Failed to start compression');
                }
            })
            .catch(error => setupDoneView(false, `An error occurred while finalizing the upload: ${error.message}`));
        }
        updateProgress(0, 'Uploading');
        uploadNextChunk();
    }

    function startProgressStream(jobId) {
        appState.eventSource = new EventSource(`/api/v1/stream/${jobId}`);
        appState.eventSource.onmessage = e => {
            const data = JSON.parse(e.data);
            if (data.type === 'progress') {
                updateProgress(data.value, 'Compressing');
            } else if (data.type === 'done') {
                appState.eventSource.close();
                setupDoneView(true, '', data.downloadUrl);
            } else if (data.type === 'error') {
                appState.eventSource.close();
                setupDoneView(false, data.message);
            }
        };
        appState.eventSource.onerror = () => {
            if (appState.eventSource) appState.eventSource.close();
            if (!document.getElementById('done-view')) {
                setupDoneView(false, 'Connection to the server was lost');
            }
        };
    }

    function parseSizeToBytes(sizeStr) {
        const size = parseFloat(sizeStr);
        if (!sizeStr || isNaN(size)) return 0;
        const unit = sizeStr.toUpperCase().slice(-1);
        if (unit === 'G') return size * 1024 * 1024 * 1024;
        if (unit === 'M') return size * 1024 * 1024;
        if (unit === 'K') return size * 1024;
        return size;
    }

    fetch('/config')
        .then(response => response.json())
        .then(config => {
            if (config.maxUploadSize) {
                appState.maxUploadSizeString = config.maxUploadSize;
                appState.maxUploadSizeBytes = parseSizeToBytes(config.maxUploadSize);
            }
        })
        .catch(error => console.error('Failed to fetch config:', error));

    setupUploadView();
});