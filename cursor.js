// Custom cursor system
function initializeRelicCursor() {
    const fine = window.matchMedia('(pointer: fine)').matches;
    console.info('[RelicCursor] Pointer fine:', fine);
    if (!fine) { console.info('[RelicCursor] Using system cursor (coarse pointer).'); return; }

    // Ensure CSS variable is applied
    const computed = getComputedStyle(document.documentElement).getPropertyValue('--relic-cursor').trim();
    console.info('[RelicCursor] --relic-cursor:', computed || '(missing)');
    if (!computed) document.documentElement.style.setProperty('--relic-cursor', "url('/relic_cursor.png') 16 2, auto");

    const img = new Image();
    img.onload = () => {
        console.info('[RelicCursor] Loaded relic_cursor.png', { w: img.naturalWidth, h: img.naturalHeight });
        document.documentElement.classList.add('use-custom-cursor');
        let cursor = document.getElementById('custom-cursor');
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'custom-cursor';
            document.body.appendChild(cursor);
        }
        const INTERACTIVE_SELECTOR = '.arrow, .gender-toggle';
        const show = () => (cursor.style.opacity = '1');
        const hide = () => { cursor.style.opacity = '0'; cursor.classList.remove('active'); cursor.classList.remove('cooldown'); };
        let lastPos = { x: 0, y: 0, has: false };
        const updateAt = (x, y) => {
            cursor.style.left = x + 'px'; cursor.style.top = y + 'px';
            const el = document.elementFromPoint(x, y);
            const interactive = el && el.closest(INTERACTIVE_SELECTOR);
            const isDisabled = !!(interactive && interactive.disabled);
            cursor.classList.toggle('active', !!interactive);
            cursor.classList.toggle('cooldown', !!(interactive && isDisabled));
            show();
        };
        window.addEventListener('mousemove', (e) => {
            lastPos = { x: e.clientX, y: e.clientY, has: true };
            updateAt(e.clientX, e.clientY);
        });
        document.addEventListener('relic-cursor-refresh', () => {
            if (lastPos.has) updateAt(lastPos.x, lastPos.y);
        });
        window.addEventListener('mouseenter', show);
        window.addEventListener('mouseleave', hide);
        window.addEventListener('blur', hide);
        window.addEventListener('touchstart', () => {
            console.info('[RelicCursor] Touch detected, hiding custom cursor.');
            hide();
            document.documentElement.classList.remove('use-custom-cursor');
        }, { passive: true });
        console.info('[RelicCursor] Custom cursor active.');
    };
    img.onerror = (e) => console.error('[RelicCursor] Failed to load /relic_cursor.png', e);
    img.src = '/relic_cursor.png';
}