import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import {
    addSelectionNote,
    collectSelectionNotes,
    rewriteSelectionNote,
    selectionNoteBounds,
    selectionNoteIdInRange,
} from '@/lib/editor/selectionNote';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { content: 'inline*', group: 'block' },
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

function stateFromText(text: string) {
    const doc = schema.node('doc', null, [
        schema.node('paragraph', null, text.length > 0 ? [schema.text(text)] : []),
    ]);
    return EditorState.create({ schema, doc });
}

describe('selection notes', () => {
    it('groups one highlight that is split across text nodes and paragraphs', () => {
        const mark = schema.marks.selectionNote.create({ id: 'n1', note: 'station' });
        const doc = schema.node('doc', null, [
            schema.node('paragraph', null, [
                schema.text('The train ', [mark]),
                schema.text('pulled', [mark]),
            ]),
            schema.node('paragraph', null, [
                schema.text('in', [mark]),
            ]),
        ]);

        expect(collectSelectionNotes(doc)).toEqual([
            {
                id: 'n1',
                note: 'station',
                excerpt: 'The train pulled in',
                from: 1,
                to: doc.content.size - 1,
            },
        ]);
    });

    it('adds, rewrites, and clears a note without treating the note as manuscript text', () => {
        let state = stateFromText('Hello world');
        let tr = state.tr;
        expect(addSelectionNote(tr, 1, 6, 'n1', '  alpha > beta  ')).toBe(true);
        state = state.apply(tr);

        expect(collectSelectionNotes(state.doc)).toEqual([
            { id: 'n1', note: 'alpha > beta', excerpt: 'Hello', from: 1, to: 6 },
        ]);
        expect(state.doc.textBetween(0, state.doc.content.size, ' ')).toBe('Hello world');
        expect(selectionNoteIdInRange(state.doc, 1, 6)).toBe('n1');
        expect(selectionNoteIdInRange(state.doc, 1, 12)).toBeNull();
        expect(selectionNoteBounds(state.doc, 'n1')).toEqual({ from: 1, to: 6 });

        tr = state.tr;
        expect(rewriteSelectionNote(tr, 'n1', 'later')).toBe(true);
        state = state.apply(tr);
        expect(collectSelectionNotes(state.doc)[0]?.note).toBe('later');

        tr = state.tr;
        expect(rewriteSelectionNote(tr, 'n1', '   ')).toBe(true);
        state = state.apply(tr);
        expect(collectSelectionNotes(state.doc)).toEqual([]);
    });

    it('ignores an empty note and an unchanged rewrite', () => {
        const state = stateFromText('Hello');
        expect(addSelectionNote(state.tr, 1, 6, 'n1', '   ')).toBe(false);

        const mark = schema.marks.selectionNote.create({ id: 'n1', note: 'kept' });
        const doc = schema.node('doc', null, [
            schema.node('paragraph', null, [schema.text('Hello', [mark])]),
        ]);
        const marked = EditorState.create({ schema, doc });
        expect(rewriteSelectionNote(marked.tr, 'n1', 'kept')).toBe(false);
        expect(rewriteSelectionNote(marked.tr, 'missing', 'next')).toBe(false);
    });
});
