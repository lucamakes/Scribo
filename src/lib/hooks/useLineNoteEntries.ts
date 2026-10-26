'use client';

import { useCallback, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { Editor } from '@tiptap/core';
import { forEachLineBlock, isLineNoteTarget, readLineNote } from '@/lib/editor/lineNoteExtension';

/**
 * One margin note aligned with a line in the manuscript.
 */
export interface LineNoteEntry {
    readonly pos: number;
    readonly top: number;
    readonly height: number;
    readonly note: string;
    readonly excerpt: string;
}

/**
 * Snapshot of the lines that can hold notes, plus the line the cursor is in.
 */
export interface LineNoteLayout {
    readonly entries: readonly LineNoteEntry[];
    readonly activePos: number | null;
}

function excerptFor(text: string): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length <= 80) return flat;
    return `${flat.slice(0, 79)}…`;
}

function sameEntries(current: readonly LineNoteEntry[], next: readonly LineNoteEntry[]): boolean {
    if (current.length !== next.length) return false;
    for (let index = 0; index < current.length; index += 1) {
        const left = current[index];
        const right = next[index];
        if (
            left.pos !== right.pos
            || left.top !== right.top
            || left.height !== right.height
            || left.note !== right.note
            || left.excerpt !== right.excerpt
        ) {
            return false;
        }
    }
    return true;
}

function viewIsReady(editor: Editor): boolean {
    try {
        return Boolean(editor.view?.dom);
    } catch {
        return false;
    }
}

function activeLinePos(editor: Editor): number | null {
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth >= 1; depth -= 1) {
        const node = $from.node(depth);
        const parent = $from.node(depth - 1);
        if (isLineNoteTarget(node, parent)) {
            return $from.before(depth);
        }
    }
    return null;
}

/**
 * Measure each manuscript line so a note field can sit beside it.
 * `layoutToken` should change when font size or line height changes, because
 * those restyle the text without an editor transaction.
 */
export function useLineNoteEntries(
    editor: Editor | null,
    manuscriptRef: RefObject<HTMLElement | null>,
    enabled: boolean,
    layoutToken: string,
): LineNoteLayout {
    const [entries, setEntries] = useState<readonly LineNoteEntry[]>([]);
    const [activePos, setActivePos] = useState<number | null>(null);

    const measure = useCallback(() => {
        const root = manuscriptRef.current;
        if (!enabled || !editor || editor.isDestroyed || !root || !viewIsReady(editor)) {
            setEntries((current) => (current.length === 0 ? current : []));
            setActivePos((current) => (current === null ? current : null));
            return;
        }

        const rootRect = root.getBoundingClientRect();
        const next: LineNoteEntry[] = [];
        forEachLineBlock(editor.state.doc, (node, pos) => {
            const dom = editor.view.nodeDOM(pos);
            if (!(dom instanceof HTMLElement)) return;
            const rect = dom.getBoundingClientRect();
            next.push({
                pos,
                top: Math.round(rect.top - rootRect.top),
                height: Math.max(1, Math.round(rect.height)),
                note: readLineNote(node) ?? '',
                excerpt: excerptFor(node.textContent),
            });
        });

        setEntries((current) => (sameEntries(current, next) ? current : next));
        const nextActive = activeLinePos(editor);
        setActivePos((current) => (current === nextActive ? current : nextActive));
    }, [editor, enabled, manuscriptRef]);

    useLayoutEffect(() => {
        let cancelled = false;
        let frame = 0;
        const run = () => {
            if (!cancelled) measure();
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(run);
        };

        // Measure after layout, but not synchronously inside the effect.
        queueMicrotask(run);

        if (!enabled || !editor || editor.isDestroyed) {
            return () => {
                cancelled = true;
                cancelAnimationFrame(frame);
            };
        }

        const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
            if (!transaction.docChanged) {
                const nextActive = activeLinePos(editor);
                setActivePos((current) => (current === nextActive ? current : nextActive));
                return;
            }
            schedule();
        };
        editor.on('transaction', onTransaction);

        const root = manuscriptRef.current;
        const observer = new ResizeObserver(schedule);
        if (root) observer.observe(root);
        window.addEventListener('resize', schedule);

        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            editor.off('transaction', onTransaction);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
        };
    }, [editor, enabled, layoutToken, measure, manuscriptRef]);

    return { entries, activePos };
}
