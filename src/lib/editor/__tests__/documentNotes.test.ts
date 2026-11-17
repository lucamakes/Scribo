import { Schema } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { activeNoteId, noteBounds, notesInDocument } from '@/lib/editor/documentNotes';
import { forEachLineBlock, readLineNote } from '@/lib/editor/lineNoteExtension';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: {
            content: 'inline*',
            group: 'block',
            attrs: { lineNote: { default: null } },
        },
        text: { group: 'inline' },
    },
    marks: {
        selectionNote: {
            attrs: {
                id: { default: null },
                note: { default: '' },
            },
            inclusive: false,
        },
    },
});

function paragraph(text: string, lineNote: string | null = null, markedWith?: { id: string; note: string }) {
    const marks = markedWith ? [schema.marks.selectionNote.create(markedWith)] : [];
    return schema.node('paragraph', { lineNote }, text.length > 0 ? [schema.text(text, marks)] : []);
}

function sampleDoc() {
    return schema.node('doc', null, [
        paragraph('First line', 'tighten this'),
        paragraph('Second line has a noted passage', null, { id: 'n1', note: 'check the date' }),
        paragraph('Third line'),
    ]);
}

/**
 * The scan the notes hook used before it shared a cached one: walk every line block.
 */
function legacyActiveLineId(doc: ProseMirrorNode, from: number, to: number): string | null {
    let lineId: string | null = null;
    forEachLineBlock(doc, (node, pos) => {
        if (!readLineNote(node)) return;
        if (from >= pos && to <= pos + node.nodeSize) lineId = `line:${pos}`;
    });
    return lineId;
}

describe('notesInDocument', () => {
    it('lists selection and line notes in reading order', () => {
        const notes = notesInDocument(sampleDoc());

        expect(notes.map((note) => [note.id, note.kind, note.note])).toEqual([
            ['line:0', 'line', 'tighten this'],
            ['n1', 'selection', 'check the date'],
        ]);
        expect(notes[0]).toMatchObject({ excerpt: 'First line', from: 1, to: 11 });
        expect(notes[1]).toMatchObject({ excerpt: 'Second line has a noted passage' });
    });

    it('reuses the scan for the same document and rescans a changed one', () => {
        const doc = sampleDoc();
        const first = notesInDocument(doc);

        expect(notesInDocument(doc)).toBe(first);
        expect(notesInDocument(sampleDoc())).not.toBe(first);
    });

    it('is empty for a document with no notes', () => {
        const doc = schema.node('doc', null, [paragraph('Nothing here')]);

        expect(notesInDocument(doc)).toEqual([]);
    });
});

describe('noteBounds', () => {
    it('reads the range from a scan and returns null for an unknown id', () => {
        const notes = notesInDocument(sampleDoc());
        const marked = notes.find((note) => note.id === 'n1');

        expect(noteBounds(notes, 'n1')).toEqual({ from: marked?.from, to: marked?.to });
        expect(noteBounds(notes, 'missing')).toBeNull();
    });
});

describe('activeNoteId', () => {
    const doc = sampleDoc();
    const notes = notesInDocument(doc);
    const marked = notes.find((note) => note.id === 'n1');

    it('prefers the highlighted passage that holds the selection', () => {
        expect(activeNoteId(doc, notes, marked!.from, marked!.to)).toBe('n1');
        expect(activeNoteId(doc, notes, marked!.from + 2, marked!.from + 6)).toBe('n1');
    });

    it('falls back to the line note whose line holds the selection', () => {
        expect(activeNoteId(doc, notes, 2, 6)).toBe('line:0');
    });

    it('matches the earlier line-by-line scan for every selection in the document', () => {
        const lineOnly = notes.filter((note) => note.kind === 'line');
        for (let from = 0; from < doc.content.size; from += 1) {
            for (let to = from + 1; to <= doc.content.size; to += 1) {
                const selectionId = activeNoteId(doc, [], from, to);
                if (selectionId) continue;
                expect(activeNoteId(doc, lineOnly, from, to)).toBe(legacyActiveLineId(doc, from, to));
            }
        }
    });

    it('returns null when the selection is on a line without a note', () => {
        const third = doc.content.size - 3;
        expect(activeNoteId(doc, notes, third, third + 2)).toBeNull();
    });

    it('returns null when the selection spans lines', () => {
        expect(activeNoteId(doc, notes, 2, doc.content.size - 2)).toBeNull();
    });
});
