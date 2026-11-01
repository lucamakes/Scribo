/**
 * One saved note shown in the sidebar.
 */
export interface ManuscriptNoteItem {
    readonly id: string;
    readonly kind: 'selection' | 'line';
    readonly note: string;
    readonly excerpt: string;
    readonly from: number;
    readonly to: number;
}

/**
 * The highlight the writer is about to annotate.
 */
export interface PendingNote {
    readonly excerpt: string;
    readonly noteId: string | null;
    readonly seed: string;
}

/**
 * Notes for the manuscript that is open right now.
 */
export interface ManuscriptNotesSnapshot {
    readonly active: boolean;
    readonly notesInEditor: boolean;
    readonly notes: readonly ManuscriptNoteItem[];
    readonly pending: PendingNote | null;
    readonly activeId: string | null;
}

/**
 * Writes and navigation the open editor can perform.
 */
export interface ManuscriptNoteActions {
    savePending: (note: string) => void;
    update: (id: string, note: string) => void;
    focus: (id: string) => void;
}

const EMPTY_SNAPSHOT: ManuscriptNotesSnapshot = {
    active: false,
    notesInEditor: false,
    notes: [],
    pending: null,
    activeId: null,
};

const listeners = new Set<() => void>();
let snapshot: ManuscriptNotesSnapshot = EMPTY_SNAPSHOT;
let notesInEditorFlag = false;
let actions: ManuscriptNoteActions | null = null;

function emit(next: ManuscriptNotesSnapshot): void {
    snapshot = next;
    listeners.forEach((listener) => listener());
}

function sameNotes(left: readonly ManuscriptNoteItem[], right: readonly ManuscriptNoteItem[]): boolean {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
        const a = left[index];
        const b = right[index];
        if (a.id !== b.id || a.kind !== b.kind || a.note !== b.note || a.excerpt !== b.excerpt || a.from !== b.from) {
            return false;
        }
    }
    return true;
}

function samePending(left: PendingNote | null, right: PendingNote | null): boolean {
    if (left === right) return true;
    if (!left || !right) return false;
    return left.excerpt === right.excerpt && left.noteId === right.noteId && left.seed === right.seed;
}

/**
 * Subscribe to the open manuscript's notes.
 */
export function subscribeManuscriptNotes(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

/**
 * Current notes snapshot. Stable while nothing about the open file changed.
 */
export function getManuscriptNotesSnapshot(): ManuscriptNotesSnapshot {
    return snapshot;
}

/**
 * Server render has no editor, so the notes section stays empty.
 */
export function getManuscriptNotesServerSnapshot(): ManuscriptNotesSnapshot {
    return EMPTY_SNAPSHOT;
}

/**
 * Replace the snapshot when the notes, the highlight, or the active row changed.
 */
export function publishManuscriptNotes(next: ManuscriptNotesSnapshot): void {
    const withFlag: ManuscriptNotesSnapshot = { ...next, notesInEditor: notesInEditorFlag };
    if (
        snapshot.active === withFlag.active
        && snapshot.notesInEditor === withFlag.notesInEditor
        && snapshot.activeId === withFlag.activeId
        && samePending(snapshot.pending, withFlag.pending)
        && sameNotes(snapshot.notes, withFlag.notes)
    ) {
        return;
    }
    emit(withFlag);
}

/**
 * Where the list is drawn. Fullscreen and narrow windows cover the file sidebar,
 * so the same list moves beside the manuscript.
 */
export function setManuscriptNotesInEditor(notesInEditor: boolean): void {
    if (notesInEditorFlag === notesInEditor) return;
    notesInEditorFlag = notesInEditor;
    if (!snapshot.active) return;
    emit({ ...snapshot, notesInEditor });
}

/**
 * Actions for the notes list. Null when no manuscript is open.
 */
export function manuscriptNoteActions(): ManuscriptNoteActions | null {
    return actions;
}

/**
 * Register the open editor as the target for the notes list.
 */
export function setManuscriptNoteActions(next: ManuscriptNoteActions | null): void {
    actions = next;
}

/**
 * Drop notes when the manuscript editor unmounts.
 */
export function clearManuscriptNotes(): void {
    actions = null;
    if (!snapshot.active && snapshot.notes.length === 0 && snapshot.pending === null) return;
    emit({ ...EMPTY_SNAPSHOT, notesInEditor: notesInEditorFlag });
}
