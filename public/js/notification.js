export function showNotification(message, duration = 3500) {
    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('show'));
    });

    setTimeout(() => {
        el.classList.remove('show');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
        setTimeout(() => { if (el.parentNode) el.remove(); }, 500);
    }, duration);
}
