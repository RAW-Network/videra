document.addEventListener('DOMContentLoaded', () => {
    const appContainer = document.getElementById('app-container');
    const uploadViewTemplate = document.getElementById('upload-view-template');
    const settingsViewTemplate = document.getElementById('settings-view-template');
    const progressViewTemplate = document.getElementById('progress-view-template');
    const doneViewTemplate = document.getElementById('done-view-template');

    let selectedFile = null;
    let eventSource = null;
    let maxUploadSizeBytes = 0;
    let maxUploadSizeString = '';

    function showNotification(message, duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => {
                notification.remove();
            });
        }, duration);
    }

    function renderView(template) {
        const content = template.content.cloneNode(true);
        appContainer.innerHTML = '';
        appContainer.appendChild(content);
        appContainer.style.animation = 'fadeIn 0.5s ease-out';
    }

    function setupUploadView() {
        renderView(uploadViewTemplate);
        
        const dropArea = document.getElementById('drop-area');
        const fileElem = document.getElementById('fileElem');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
                if (eventName === 'dragenter' || eventName === 'dragover') {
                    dropArea.classList.add('highlight');
                } else {
                    dropArea.classList.remove('highlight');
                }
            });
        });

        dropArea.addEventListener('drop', e => {
            handleFileSelect(e.dataTransfer.files);
        });

        fileElem.addEventListener('change', e => {
            handleFileSelect(e.target.files);
        });

        dropArea.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileElem.click();
            }
        });
    }

    function setupSettingsView() {
        renderView(settingsViewTemplate);
        
        const fileInfo = document.getElementById('file-info');
        const compressBtn = document.getElementById('compressBtn');
        const backBtn = document.getElementById('backBtn');
        
        const fileNameNode = document.createElement('strong');
        fileNameNode.textContent = selectedFile.name;
        fileInfo.appendChild(fileNameNode);
        fileInfo.append(` (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);

        compressBtn.addEventListener('click', e => {
            e.preventDefault();
            compressBtn.disabled = true;
            
            const maxSizeInput = document.getElementById('maxSize');
            const targetSize = parseFloat(maxSizeInput.value);

            if (isNaN(targetSize) || targetSize <= 0) {
                showNotification('Please enter a valid target size');
                compressBtn.disabled = false;
                return;
            }
            startCompression(targetSize);
        });

        backBtn.addEventListener('click', setupUploadView);
    }

    function setupProgressView(initialText = "Uploading...") {
        renderView(progressViewTemplate);
        const progressText = document.getElementById('progress-text');
        progressText.textContent = initialText;

        const cancelBtn = document.getElementById('cancelBtn');
        cancelBtn.addEventListener('click', () => {
            const jobId = cancelBtn.dataset.jobId;
            if (!jobId) return;
            fetch(`/api/v1/jobs/${jobId}/cancel`, { method: 'POST' });
            setupDoneView(false, 'Your compression has been cancelled');
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelling...';
        });
    }

    function updateProgress(percent, text) {
        const progressBarInner = document.getElementById('progress-bar-inner');
        const progressText = document.getElementById('progress-text');
        if (progressBarInner && progressText) {
            progressBarInner.style.width = `${percent}%`;
            progressText.textContent = `${text}… ${percent}%`;
        }
    }

    function setupDoneView(isSuccess, message, downloadUrl = null) {
        if(eventSource) {
            eventSource.close();
            eventSource = null;
        }

        renderView(doneViewTemplate);
        
        const doneIcon = document.querySelector('.done-icon');
        const title = document.querySelector('#done-view h2');
        const description = document.querySelector('.done-description');
        const downloadBtn = document.getElementById('downloadBtn');
        const resetBtn = document.getElementById('resetBtn');

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

        resetBtn.addEventListener('click', setupUploadView);
    }

    function handleFileSelect(files) {
        if (files.length === 0) return;
        selectedFile = files[0];
        if (maxUploadSizeBytes > 0 && selectedFile.size > maxUploadSizeBytes) {
            setupDoneView(false, `File exceeds the size limit of ${maxUploadSizeString}`);
            selectedFile = null;
            return;
        }
        setupSettingsView();
    }

    function startCompression(targetSize) {
        if (!selectedFile) {
            showNotification('No file selected');
            return;
        }
    
        setupProgressView("Preparing to upload...");
    
        const CHUNK_SIZE = 50 * 1024 * 1024;
        const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
        const uploadId = 'upload-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
        
        let chunkNumber = 0;
    
        function uploadNextChunk() {
            if (chunkNumber >= totalChunks) {
                completeUpload();
                return;
            }
    
            const start = chunkNumber * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
            const chunk = selectedFile.slice(start, end);
    
            const formData = new FormData();
            formData.append('video', chunk, selectedFile.name);
            formData.append('chunkNumber', chunkNumber);
            formData.append('totalChunks', totalChunks);
            formData.append('uploadId', uploadId);
            formData.append('originalName', selectedFile.name);
    
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/v1/upload/chunk', true);
            
            xhr.onload = () => {
                if (xhr.status === 200) {
                    chunkNumber++;
                    const uploadProgress = Math.round((chunkNumber / totalChunks) * 100);
                    updateProgress(uploadProgress, 'Uploading');
                    uploadNextChunk();
                } else {
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        setupDoneView(false, errorData.error || 'An error occurred while uploading a chunk');
                    } catch (e) {
                        setupDoneView(false, 'An unknown upload error occurred');
                    }
                }
            };
    
            xhr.onerror = () => {
                setupDoneView(false, 'A network error occurred during chunk upload');
            };
            
            xhr.send(formData);
        }
        
        function completeUpload() {
            updateProgress(100, 'Finalizing upload');
            
            fetch('/api/v1/upload/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    totalChunks,
                    uploadId,
                    originalName: selectedFile.name,
                    targetSizeMB: targetSize,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Server error') });
                }
                return response.json();
            })
            .then(data => {
                if (data.jobId) {
                    const cancelBtn = document.getElementById('cancelBtn');
                    if (cancelBtn) {
                        cancelBtn.dataset.jobId = data.jobId;
                    }
                    startProgressStream(data.jobId);
                } else {
                    setupDoneView(false, data.error || 'Failed to start compression.');
                }
            })
            .catch((error) => {
                setupDoneView(false, `An error occurred while finalizing the upload: ${error.message}`);
            });
        }
    
        uploadNextChunk();
    }
    
    function startProgressStream(jobId) {
        eventSource = new EventSource(`/api/v1/stream/${jobId}`);
        eventSource.onmessage = e => {
            const data = JSON.parse(e.data);
            if (data.type === 'progress') {
                updateProgress(data.value, 'Compressing');
            } else if (data.type === 'done') {
                eventSource.close();
                setupDoneView(true, '', data.downloadUrl);
            } else if (data.type === 'error') {
                eventSource.close();
                setupDoneView(false, data.message);
            }
        };
        eventSource.onerror = () => {
            if(eventSource) {
                eventSource.close();
            }
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
                maxUploadSizeString = config.maxUploadSize;
                maxUploadSizeBytes = parseSizeToBytes(config.maxUploadSize);
            }
        })
        .catch(error => console.error('Failed to fetch config:', error));

    setupUploadView();
});