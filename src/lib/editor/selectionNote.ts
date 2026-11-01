import { Mark, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

const MARK_NAME = 'selectionNote';

/**
 * A highlight stored on a span of manuscript text, with the note itself in an attribute.
 */
export interface SelectionNoteRecord {
    readonly id: string;
    readonly note: string;
    readonly excerpt: string;
    readonly from: number;
    readonly to: number;
}

interface MarkedSpan {
    readonly id: string;
    readonly note: string;
    readonly text: string;
    readonly from: number;
    readonly to: number;
}

/**
 * Short single-line preview of manuscript text.
 */
export function excerptText(text: string): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= 72) return flat;
    return `${flat.slice(0, 72).trimEnd()}…`;
}

/**
 * Highlight mark for a note on a selected span.
 * The note text lives in `data-selection-note`, so it is saved with the file
 * and is not part of the manuscript word count.
 */
export const SelectionNote = Mark.create({
    name: MARK_NAME,
    inclusive: false,
    excludes: '_',

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-note-id'),
                renderHTML: (attributes: { id?: unknown }) => {
                    if (typeof attributes.id !== 'string' || attributes.id.length === 0) return {};
                    return { 'data-note-id': attributes.id };
                },
            },
            note: {
                default: '',
                parseHTML: (element: HTMLElement) => element.getAttribute('data-selection-note') ?? '',
                renderHTML: (attributes: { note?: unknown }) => {
                    if (typeof attributes.note !== 'string' || attributes.note.length === 0) return {};
                    return { 'data-selection-note': attributes.note };
                },
            },
        };
    },

    parseHTML() {
        return [{ tag: 'span[data-note-id]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes), 0];
    },
});

function markedSpans(doc: ProseMirrorNode): MarkedSpan[] {
    const spans: MarkedSpan[] = [];
    doc.descendants((node, pos) => {
        if (!node.isText) return;
        const mark = node.marks.find((item) => item.type.name === MARK_NAME);
        if (!mark) return;
        const id = mark.attrs.id;
        const note = mark.attrs.note;
        if (typeof id !== 'string' || id.length === 0) return;
        if (typeof note !== 'string' || note.length === 0) return;
        spans.push({
            id,
            note,
            text: node.text ?? '',
            from: pos,
            to: pos + node.nodeSize,
        });
    });
    return spans;
}

/**
 * Notes in document order. Fragments that share an id are one note.
 */
export function collectSelectionNotes(doc: ProseMirrorNode): SelectionNoteRecord[] {
    const grouped: { id: string; note: string; text: string; from: number; to: number }[] = [];
    for (const span of markedSpans(doc)) {
        const current = grouped[grouped.length - 1];
        if (current && current.id === span.id) {
            const gap = span.from > current.to ? ' ' : '';
            current.text += `${gap}${span.text}`;
            current.to = span.to;
            continue;
        }
        grouped.push({
            id: span.id,
            note: span.note,
            text: span.text,
            from: span.from,
            to: span.to,
        });
    }
    return grouped.map((note) => ({
        id: note.id,
        note: note.note,
        excerpt: excerptText(note.text),
        from: note.from,
        to: note.to,
    }));
}

/**
 * The selection-note id that covers every text character in the range, if there is exactly one.
 */
export function selectionNoteIdInRange(doc: ProseMirrorNode, from: number, to: number): string | null {
    if (from >= to) return null;
    const ids = new Set<string | null>();
    let sawText = false;
    doc.nodesBetween(from, to, (node) => {
        if (!node.isText) return;
        sawText = true;
        const mark = node.marks.find((item) => item.type.name === MARK_NAME);
        const id = mark?.attrs.id;
        ids.add(typeof id === 'string' && id.length > 0 ? id : null);
    });
    if (!sawText || ids.size !== 1) return null;
    const id = [...ids][0];
    return id;
}

/**
 * Document range covered by a selection note, or null when the id is gone.
 */
export function selectionNoteBounds(
    doc: ProseMirrorNode,
    id: string,
): { from: number; to: number } | null {
    const matches = markedSpans(doc).filter((span) => span.id === id);
    if (matches.length === 0) return null;
    return {
        from: matches[0].from,
        to: matches[matches.length - 1].to,
    };
}

/**
 * Paint a new selection note onto a range. An empty note does nothing.
 */
export function addSelectionNote(
    tr: Transaction,
    from: number,
    to: number,
    id: string,
    note: string,
): boolean {
    const type = tr.doc.type.schema.marks[MARK_NAME];
    const trimmed = note.trim();
    if (!type || trimmed.length === 0 || from >= to || to > tr.doc.content.size) return false;
    tr.addMark(from, to, type.create({ id, note: trimmed }));
    return true;
}

/**
 * Replace the text of a selection note, or remove the highlight when the text is empty.
 * Returns false when the id is missing or the text is unchanged.
 */
export function rewriteSelectionNote(tr: Transaction, id: string, note: string): boolean {
    const type = tr.doc.type.schema.marks[MARK_NAME];
    if (!type) return false;
    const ranges: { from: number; to: number }[] = [];
    let current = '';
    tr.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const mark = node.marks.find((item) => item.type === type && item.attrs.id === id);
        if (!mark) return;
        if (ranges.length === 0 && typeof mark.attrs.note === 'string') current = mark.attrs.note;
        ranges.push({ from: pos, to: pos + node.nodeSize });
    });
    const trimmed = note.trim();
    if (ranges.length === 0 || trimmed === current) return false;
    for (const range of ranges) {
        tr.removeMark(range.from, range.to, type);
        if (trimmed.length > 0) {
            tr.addMark(range.from, range.to, type.create({ id, note: trimmed }));
        }
    }
    return true;
}
