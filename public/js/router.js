let container = null;

export function initRouter() {
    container = document.getElementById('app-container');
}

/** Fade out → replace HTML → fade in */
export function showView(viewFactory, ...args) {
    if (!container) initRouter();

    const { html, setup } = viewFactory(...args);

    container.style.opacity = '0';
    container.style.transform = 'translateY(8px)';
    container.style.transition = 'opacity 0.15s ease, transform 0.15s ease';

    setTimeout(() => {
        container.innerHTML = html;
        if (setup) setup();

        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });
    }, 160);
}
