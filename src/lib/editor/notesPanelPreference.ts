const STORAGE_KEY = 'scribo.notesPanelOpen';

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function readNotesPanelOpen(): boolean {
    if (cached !== null) return cached;
    if (typeof window === 'undefined') return true;
    try {
        cached = window.localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
        cached = true;
    }
    return cached;
}

/**
 * Subscribe to whether the notes panel beside the manuscript is open.
 */
export function subscribeNotesPanelOpen(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Whether the notes panel is expanded in this browser.
 */
export function getNotesPanelOpenSnapshot(): boolean {
    return readNotesPanelOpen();
}

/**
 * The panel starts open so the first paint matches a writer who has not chosen yet.
 */
export function getNotesPanelOpenServerSnapshot(): boolean {
    return true;
}

/**
 * Expand or collapse the notes panel and remember the choice.
 */
export function setNotesPanelOpen(open: boolean): void {
    cached = open;
    try {
        window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
        // Storage can be unavailable in private browsing.
    }
    listeners.forEach((listener) => listener());
}
