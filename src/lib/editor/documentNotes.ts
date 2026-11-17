import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { forEachLineBlock, readLineNote } from '@/lib/editor/lineNoteExtension';
import type { ManuscriptNoteItem } from '@/lib/editor/manuscriptNotesStore';
import { collectSelectionNotes, excerptText, selectionNoteIdInRange } from '@/lib/editor/selectionNote';

/**
 * ProseMirror documents are immutable, so one scan stays valid for as long as the
 * same document object is current. Selection moves and focus changes reuse it.
 */
const scanCache = new WeakMap<ProseMirrorNode, readonly ManuscriptNoteItem[]>();

function lineNotesInDocument(doc: ProseMirrorNode): ManuscriptNoteItem[] {
    const items: ManuscriptNoteItem[] = [];
    forEachLineBlock(doc, (node, pos) => {
        const note = readLineNote(node);
        if (!note) return;
        const from = pos + 1;
        items.push({
            id: `line:${pos}`,
            kind: 'line',
            note,
            excerpt: excerptText(node.textContent),
            from,
            to: Math.max(from, pos + node.nodeSize - 1),
        });
    });
    return items;
}

/**
 * Every note in the document, in reading order. The result is cached per document.
 */
export function notesInDocument(doc: ProseMirrorNode): readonly ManuscriptNoteItem[] {
    const cached = scanCache.get(doc);
    if (cached) return cached;

    const selection = collectSelectionNotes(doc).map((note): ManuscriptNoteItem => ({
        id: note.id,
        kind: 'selection',
        note: note.note,
        excerpt: note.excerpt,
        from: note.from,
        to: note.to,
    }));
    const notes = [...selection, ...lineNotesInDocument(doc)].sort((left, right) => left.from - right.from);
    scanCache.set(doc, notes);
    return notes;
}

/**
 * Range a selection note covers, read from an existing scan instead of the document.
 */
export function noteBounds(
    notes: readonly ManuscriptNoteItem[],
    id: string,
): { from: number; to: number } | null {
    const note = notes.find((item) => item.id === id);
    return note ? { from: note.from, to: note.to } : null;
}

/**
 * The note the current selection sits on: a highlighted passage first, then a line note
 * whose line holds the whole selection.
 */
export function activeNoteId(
    doc: ProseMirrorNode,
    notes: readonly ManuscriptNoteItem[],
    from: number,
    to: number,
): string | null {
    const selectionId = selectionNoteIdInRange(doc, from, to);
    if (selectionId) return selectionId;
    // A line note spans its block's content, so the block itself is one position wider each side.
    const line = notes.find((item) => item.kind === 'line' && from >= item.from - 1 && to <= item.to + 1);
    return line?.id ?? null;
}
