const STORAGE_KEY = 'scribo.lineNotesOpen';

const listeners = new Set<() => void>();

function readLineNotesOpen(): boolean {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Subscribe to whether the margin notes column is open.
 */
export function subscribeLineNotesOpen(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Current notes-column preference in this browser.
 */
export function getLineNotesOpenSnapshot(): boolean {
    return readLineNotesOpen();
}

/**
 * Server render keeps the column closed so the markup matches the first client paint.
 */
export function getLineNotesOpenServerSnapshot(): boolean {
    return false;
}

/**
 * Persist whether the margin notes column is open.
 */
export function setLineNotesOpen(open: boolean): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch {
        // Storage can be unavailable in private browsing.
    }
    listeners.forEach((listener) => listener());
}
