/**
 * A previously noted line, identified by its position in the document
 * before the latest edit.
 */
export interface InheritedNoteSource {
    readonly key: string;
    readonly text: string;
    readonly note: string;
}

/**
 * A line that currently carries a note after the edit.
 * `sourceKey` ties it back to the old line it was split out of, when it was.
 */
export interface InheritedNoteBlock {
    readonly pos: number;
    readonly text: string;
    readonly note: string;
    readonly sourceKey: string | null;
}

/**
 * Positions whose notes were copied onto a newly split line and should be removed.
 *
 * A group of lines counts as a split only when their texts, in order, join back
 * into the original line. Document-wide replacements (opening another file,
 * paste that isn't a pure split) fail that check and keep every note.
 *
 * Pressing Enter at the start of a line produces an empty line first and the
 * original text second. The note stays with the text in that case.
 */
export function positionsToClearInheritedNotes(
    sources: readonly InheritedNoteSource[],
    blocks: readonly InheritedNoteBlock[],
): number[] {
    const clears: number[] = [];

    for (const source of sources) {
        const group = blocks.filter(
            (block) => block.sourceKey === source.key && block.note === source.note,
        );
        if (group.length < 2) continue;

        const combined = group.map((block) => block.text).join('');
        if (combined !== source.text) continue;

        const textKeeper = group.find((block) => block.text === source.text);
        const keeper = group[0].text.length === 0 && textKeeper ? textKeeper : group[0];

        for (const block of group) {
            if (block.pos !== keeper.pos) {
                clears.push(block.pos);
            }
        }
    }

    return clears;
}
