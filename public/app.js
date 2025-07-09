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
                alert('Please enter a valid target size');
                compressBtn.disabled = false;
                return;
            }
            startCompression(targetSize);
        });

        backBtn.addEventListener('click', setupUploadView);
    }

    function setupProgressView(initialText = "Uploading") {
        renderView(progressViewTemplate);
        const progressText = document.getElementById('progress-text');
        progressText.textContent = initialText;
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
        setupProgressView();
        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('maxSize', targetSize);

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
            if (e.lengthComputable) {
                updateProgress(Math.round((e.loaded / e.total) * 100), 'Uploading');
            }
        });
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    startProgressStream(data.jobId);
                } catch (error) {
                    setupDoneView(false, 'Failed to parse server response');
                }
            } else {
                try {
                    const errorData = JSON.parse(xhr.responseText);
                    setupDoneView(false, errorData.error || 'An upload error occurred');
                } catch (e) {
                    setupDoneView(false, 'An upload error occurred');
                }
            }
        });
        xhr.addEventListener('error', () => {
            setupDoneView(false, 'A network error occurred');
        });
        xhr.open('POST', '/api/v1/upload', true);
        xhr.send(formData);
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
            eventSource.close();
            setupDoneView(false, 'Connection to the server was lost');
        };
    }

    function parseSizeToBytes(sizeStr) {
        const size = parseFloat(sizeStr);
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
