import { state } from '../state.js';
import { formatFileSize, escapeHTML } from '../utils.js';

const CIRCUMFERENCE = 2 * Math.PI * 52;

export function createProgressView() {
    const file = state.selectedFile;
    const fileName = file ? escapeHTML(file.name) : '';
    const fileSize = file ? formatFileSize(file.size) : '';

    const html = `
    <div class="view" id="progress-view" aria-live="polite">
        <header class="view-header">
            <h1>Compressing</h1>
        </header>

        <div class="progress-ring-container">
            <svg class="progress-ring" viewBox="0 0 120 120">
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#6366f1" />
                        <stop offset="100%" stop-color="#a78bfa" />
                    </linearGradient>
                </defs>
                <circle class="progress-ring-track" cx="60" cy="60" r="52" />
                <circle class="progress-ring-fill" id="progress-ring-fill" cx="60" cy="60" r="52" />
            </svg>
            <div class="progress-ring-text">
                <span class="progress-percent" id="progress-percent">0%</span>
            </div>
        </div>

        <p class="progress-phase" id="progress-phase">Uploading...</p>

        <div class="progress-file-info">
            <span class="file-name">${fileName}</span>
            <span class="file-size">${fileSize}</span>
        </div>
    </div>`;

    function setup() {
        const ringFill = document.getElementById('progress-ring-fill');
        const percentText = document.getElementById('progress-percent');
        const phaseText = document.getElementById('progress-phase');

        return {
            updateProgress(percent, text) {
                const clamped = Math.min(100, Math.max(0, Math.round(percent)));

                if (ringFill) {
                    ringFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - clamped / 100);
                }

                if (percentText) percentText.textContent = `${clamped}%`;
                if (phaseText) phaseText.textContent = text ? `${text}...` : 'Processing...';
            }
        };
    }

    return { html, setup };
}
