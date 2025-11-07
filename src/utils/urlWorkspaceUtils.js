// Helpers for syncing workspace selection with URL parameters.
const PARAMS = ['workspace'];

export function readWorkspaceFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        for (const p of PARAMS) {
            const v = params.get(p);
            if (v) return v;
        }
        return '';
    } catch {
        return '';
    }
}

export function writeWorkspaceToUrl(next) {
    try {
        const url = new URL(window.location.href);
        if (next) url.searchParams.set('workspace', next); else url.searchParams.delete('workspace');
        if (url.toString() !== window.location.href) window.history.pushState({}, '', url);
    } catch {/* noop */}
}

export function onWorkspacePopState(handler) {
    const listener = () => handler(readWorkspaceFromUrl());
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
}

