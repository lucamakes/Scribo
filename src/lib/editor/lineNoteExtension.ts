import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';
import { Mapping, ReplaceStep } from '@tiptap/pm/transform';
import { positionsToClearInheritedNotes } from '@/lib/editor/lineNoteSplit';
import type { InheritedNoteBlock, InheritedNoteSource } from '@/lib/editor/lineNoteSplit';

const lineNotePluginKey = new PluginKey('lineNote');

const LINE_PARENTS = new Set(['doc', 'blockquote', 'listItem']);
const LINE_NODES = new Set(['paragraph', 'heading', 'codeBlock']);

/**
 * True when this block is one writable line: a paragraph, heading, or code block
 * in the document, a quote, or a list item. Visual wrap is ignored, because it
 * changes with the window width and cannot hold a stable note.
 */
export function isLineNoteTarget(node: ProseMirrorNode, parent: ProseMirrorNode | null): boolean {
    if (!parent || !LINE_PARENTS.has(parent.type.name)) return false;
    return LINE_NODES.has(node.type.name);
}

/**
 * The note stored on a line, or null when the line has none.
 */
export function readLineNote(node: ProseMirrorNode): string | null {
    const note = node.attrs.lineNote;
    if (typeof note !== 'string' || note.length === 0) return null;
    return note;
}

/**
 * Visit each line that can hold a margin note.
 */
export function forEachLineBlock(
    doc: ProseMirrorNode,
    visit: (node: ProseMirrorNode, pos: number) => void,
): void {
    doc.descendants((node, pos, parent) => {
        if (!isLineNoteTarget(node, parent)) return true;
        visit(node, pos);
        return false;
    });
}

/**
 * Write a margin note onto the line at `pos`.
 * An empty string removes the note. No-ops when the value is unchanged.
 */
export function setLineNote(editor: Editor, pos: number, note: string): void {
    if (editor.isDestroyed) return;

    const next = note.length > 0 ? note : null;
    editor.commands.command(({ tr, state }) => {
        const node = state.doc.nodeAt(pos);
        if (!node) return false;
        if (readLineNote(node) === next) return false;
        tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            lineNote: next,
        });
        return true;
    });
}

interface NotedLine {
    readonly key: string;
    readonly pos: number;
    readonly end: number;
    readonly text: string;
    readonly note: string;
}

function collectNotedLines(doc: ProseMirrorNode): NotedLine[] {
    const lines: NotedLine[] = [];
    forEachLineBlock(doc, (node, pos) => {
        const note = readLineNote(node);
        if (!note) return;
        lines.push({
            key: String(pos),
            pos,
            end: pos + node.nodeSize,
            text: node.textContent,
            note,
        });
    });
    return lines;
}

function composeMapping(transactions: readonly Transaction[]): Mapping {
    const mapping = new Mapping();
    for (const transaction of transactions) {
        mapping.appendMapping(transaction.mapping);
    }
    return mapping;
}

/**
 * Drop notes that Enter copied onto the new line.
 * Notes live on the block itself, and ProseMirror copies block attributes on split.
 */
function createLineNoteSplitPlugin(): Plugin {
    return new Plugin({
        key: lineNotePluginKey,
        appendTransaction(transactions, oldState, newState) {
            if (transactions.some((transaction) => transaction.getMeta(lineNotePluginKey))) {
                return null;
            }
            if (!transactions.some((transaction) => transaction.docChanged)) return null;
            // Opening another file replaces the whole document. That is not a line split.
            const contentSize = oldState.doc.content.size;
            const replacesDocument = transactions.some((transaction) => (
                transaction.steps.some((step) => (
                    step instanceof ReplaceStep
                    && step.from === 0
                    && step.to === contentSize
                ))
            ));
            if (replacesDocument) return null;

            const previous = collectNotedLines(oldState.doc);
            if (previous.length === 0) return null;

            const mapping = composeMapping(transactions);
            const inverse = mapping.invert();
            const blocks: InheritedNoteBlock[] = [];

            forEachLineBlock(newState.doc, (node, pos) => {
                const note = readLineNote(node);
                if (!note) return;
                const oldPos = inverse.map(pos, -1);
                const source = previous.find(
                    (line) => line.note === note && oldPos >= line.pos && oldPos < line.end,
                );
                blocks.push({
                    pos,
                    text: node.textContent,
                    note,
                    sourceKey: source?.key ?? null,
                });
            });

            const sources: InheritedNoteSource[] = previous.map((line) => ({
                key: line.key,
                text: line.text,
                note: line.note,
            }));
            const clears = positionsToClearInheritedNotes(sources, blocks);
            if (clears.length === 0) return null;

            const tr = newState.tr;
            let changed = false;
            for (const pos of clears) {
                const node = tr.doc.nodeAt(pos);
                if (!node || readLineNote(node) === null) continue;
                tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    lineNote: null,
                });
                changed = true;
            }

            if (!changed) return null;
            tr.setMeta(lineNotePluginKey, true);
            return tr;
        },
    });
}

/**
 * Stores a margin note on each paragraph, heading, and code block.
 * The note is saved inside the document HTML (`data-line-note`) so it follows
 * the existing file save, demo storage, and version history without a schema change.
 */
export const LineNote = Extension.create({
    name: 'lineNote',

    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading', 'codeBlock'],
                attributes: {
                    lineNote: {
                        default: null,
                        keepOnSplit: false,
                        parseHTML: (element: HTMLElement) => {
                            const value = element.getAttribute('data-line-note');
                            return value && value.length > 0 ? value : null;
                        },
                        renderHTML: (attributes: { lineNote?: unknown }) => {
                            const note = attributes.lineNote;
                            if (typeof note !== 'string' || note.length === 0) return {};
                            return { 'data-line-note': note };
                        },
                    },
                },
            },
        ];
    },

    addProseMirrorPlugins() {
        return [createLineNoteSplitPlugin()];
    },
});
