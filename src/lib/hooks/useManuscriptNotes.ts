'use client';

import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { forEachLineBlock, readLineNote, setLineNote } from '@/lib/editor/lineNoteExtension';
import {
    publishManuscriptNotes,
    setManuscriptNoteActions,
    clearManuscriptNotes,
} from '@/lib/editor/manuscriptNotesStore';
import { setNotesPanelOpen } from '@/lib/editor/notesPanelPreference';
import type { ManuscriptNoteItem, PendingNote } from '@/lib/editor/manuscriptNotesStore';
import {
    addSelectionNote,
    collectSelectionNotes,
    excerptText,
    rewriteSelectionNote,
    selectionNoteBounds,
    selectionNoteIdInRange,
} from '@/lib/editor/selectionNote';

let dismissActiveHighlight = (): void => {};

/**
 * Drop a highlight that belonged to the manuscript being closed.
 * File switches replace the document without a focused selection.
 */
export function dismissPendingHighlight(): void {
    dismissActiveHighlight();
}

function notesUiHasFocus(): boolean {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement;
    return active instanceof Element && active.closest('[data-manuscript-notes]') !== null;
}

function lineNotes(doc: ProseMirrorNode): ManuscriptNoteItem[] {
    const items: ManuscriptNoteItem[] = [];
    forEachLineBlock(doc, (node, pos) => {
        const note = readLineNote(node);
        if (!note) return;
        const from = pos + 1;
        const to = Math.max(from, pos + node.nodeSize - 1);
        items.push({
            id: `line:${pos}`,
            kind: 'line',
            note,
            excerpt: excerptText(node.textContent),
            from,
            to,
        });
    });
    return items;
}

function notesInDocument(doc: ProseMirrorNode): ManuscriptNoteItem[] {
    const selection = collectSelectionNotes(doc).map((note): ManuscriptNoteItem => ({
        id: note.id,
        kind: 'selection',
        note: note.note,
        excerpt: note.excerpt,
        from: note.from,
        to: note.to,
    }));
    return [...selection, ...lineNotes(doc)].sort((left, right) => left.from - right.from);
}

function activeIdFor(doc: ProseMirrorNode, from: number, to: number): string | null {
    const selectionId = selectionNoteIdInRange(doc, from, to);
    if (selectionId) return selectionId;
    let lineId: string | null = null;
    forEachLineBlock(doc, (node, pos) => {
        if (!readLineNote(node)) return;
        if (from >= pos && to <= pos + node.nodeSize) lineId = `line:${pos}`;
    });
    return lineId;
}

/**
 * Keeps the notes panel in step with the open manuscript.
 * A highlight is remembered when focus moves into the notes list, so writing
 * the note does not lose the selection.
 */
export function useManuscriptNotes(editor: Editor | null): void {
    const rangeRef = useRef<{ from: number; to: number } | null>(null);
    const clearTimer = useRef<number | null>(null);
    const pendingKeyRef = useRef<string | null>(null);

    useEffect(() => {
        if (!editor || editor.isDestroyed) {
            clearManuscriptNotes();
            return;
        }

        const publish = () => {
            if (editor.isDestroyed) return;
            const doc = editor.state.doc;
            const notes = notesInDocument(doc);
            const range = rangeRef.current;
            let pending: PendingNote | null = null;
            const { from, to } = editor.state.selection;
            let activeId = from !== to ? activeIdFor(doc, from, to) : null;

            if (range && range.to <= doc.content.size && range.from < range.to) {
                const id = selectionNoteIdInRange(doc, range.from, range.to);
                const bounds = id ? selectionNoteBounds(doc, id) : null;
                const exact = bounds !== null && bounds.from === range.from && bounds.to === range.to;
                const excerpt = excerptText(doc.textBetween(range.from, range.to, ' '));
                // Keep the field open while it is focused, even after the highlight is saved.
                if (exact && id && !notesUiHasFocus()) {
                    activeId = id;
                } else if (excerpt.length > 0) {
                    pending = {
                        excerpt,
                        noteId: id,
                        seed: id ? notes.find((note) => note.id === id)?.note ?? '' : '',
                    };
                }
            } else if (range) {
                rangeRef.current = null;
            }

            const pendingKey = pending ? `${pending.noteId ?? ''}:${pending.excerpt}` : null;
            if (pendingKey && pendingKey !== pendingKeyRef.current) {
                setNotesPanelOpen(true);
            }
            pendingKeyRef.current = pendingKey;

            publishManuscriptNotes({
                active: true,
                notes,
                pending,
                activeId,
            });
        };

        const rememberSelection = () => {
            const { from, to } = editor.state.selection;
            if (from !== to) {
                if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
                clearTimer.current = null;
                rangeRef.current = { from, to };
                publish();
                return;
            }
            if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
            clearTimer.current = window.setTimeout(() => {
                clearTimer.current = null;
                if (editor.isDestroyed) return;
                const selection = editor.state.selection;
                if (selection.from !== selection.to || notesUiHasFocus()) return;
                rangeRef.current = null;
                publish();
            }, 0);
        };

        dismissActiveHighlight = () => {
            rangeRef.current = null;
            publish();
        };

        setManuscriptNoteActions({
            savePending(note: string) {
                const range = rangeRef.current;
                if (!range || editor.isDestroyed) return;
                const doc = editor.state.doc;
                if (range.from >= range.to || range.to > doc.content.size) return;
                const existing = selectionNoteIdInRange(doc, range.from, range.to);
                const tr = editor.state.tr;
                const changed = existing
                    ? rewriteSelectionNote(tr, existing, note)
                    : addSelectionNote(tr, range.from, range.to, crypto.randomUUID(), note);
                if (changed) editor.view.dispatch(tr);
            },
            update(id: string, note: string) {
                if (editor.isDestroyed) return;
                if (id.startsWith('line:')) {
                    const pos = Number(id.slice(5));
                    if (!Number.isInteger(pos)) return;
                    setLineNote(editor, pos, note.trim());
                    return;
                }
                const tr = editor.state.tr;
                if (rewriteSelectionNote(tr, id, note)) editor.view.dispatch(tr);
            },
            focus(id: string) {
                if (editor.isDestroyed) return;
                const doc = editor.state.doc;
                if (id.startsWith('line:')) {
                    const pos = Number(id.slice(5));
                    const node = doc.nodeAt(pos);
                    if (!node) return;
                    const from = pos + 1;
                    const to = Math.max(from, pos + node.nodeSize - 1);
                    editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
                    const dom = editor.view.nodeDOM(pos);
                    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    return;
                }
                const bounds = selectionNoteBounds(doc, id);
                if (!bounds) return;
                editor.chain().focus().setTextSelection(bounds).scrollIntoView().run();
                const target = editor.view.dom.querySelector(`[data-note-id="${CSS.escape(id)}"]`);
                if (target instanceof HTMLElement) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            },
        });

        const onTransaction = ({ transaction }: { transaction: Transaction }) => {
            const replacedDocument = transaction.steps.some((step) => (
                step instanceof ReplaceStep
                && step.from === 0
                && step.to === transaction.before.content.size
            ));
            if (replacedDocument) rangeRef.current = null;
            publish();
        };

        const onFocusOut = () => {
            window.setTimeout(() => {
                if (editor.isDestroyed || notesUiHasFocus()) return;
                const range = rangeRef.current;
                if (range) {
                    const id = selectionNoteIdInRange(editor.state.doc, range.from, range.to);
                    const bounds = id ? selectionNoteBounds(editor.state.doc, id) : null;
                    const exact = bounds !== null && bounds.from === range.from && bounds.to === range.to;
                    if (exact) rangeRef.current = null;
                }
                publish();
            }, 0);
        };

        editor.on('transaction', onTransaction);
        editor.on('selectionUpdate', rememberSelection);
        document.addEventListener('focusout', onFocusOut);
        publish();

        return () => {
            if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
            document.removeEventListener('focusout', onFocusOut);
            editor.off('transaction', onTransaction);
            editor.off('selectionUpdate', rememberSelection);
            dismissActiveHighlight = () => {};
            setManuscriptNoteActions(null);
            clearManuscriptNotes();
        };
    }, [editor]);
}
