import { initTheme } from './theme.js';
import { initRouter, showView } from './router.js';
import { fetchConfig } from './api.js';
import { createUploadView } from './views/upload.js';

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initRouter();
    await fetchConfig();
    showView(createUploadView);
});
