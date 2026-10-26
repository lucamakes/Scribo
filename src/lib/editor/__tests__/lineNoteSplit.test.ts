import { positionsToClearInheritedNotes } from '@/lib/editor/lineNoteSplit';
import type { InheritedNoteBlock, InheritedNoteSource } from '@/lib/editor/lineNoteSplit';

const source: InheritedNoteSource = {
    key: 'line-1',
    text: 'Hello world',
    note: 'Check this',
};

function block(
    pos: number,
    text: string,
    sourceKey: string | null = 'line-1',
    note = 'Check this',
): InheritedNoteBlock {
    return { pos, text, note, sourceKey };
}

describe('positionsToClearInheritedNotes', () => {
    it('keeps the note on the first half when a line is split in the middle', () => {
        const clears = positionsToClearInheritedNotes(
            [source],
            [block(1, 'Hello'), block(8, ' world')],
        );

        expect(clears).toEqual([8]);
    });

    it('keeps the note on the original text when Enter is pressed at the start', () => {
        const clears = positionsToClearInheritedNotes(
            [source],
            [block(1, ''), block(3, 'Hello world')],
        );

        expect(clears).toEqual([1]);
    });

    it('clears the note on the new empty line when Enter is pressed at the end', () => {
        const clears = positionsToClearInheritedNotes(
            [source],
            [block(1, 'Hello world'), block(14, '')],
        );

        expect(clears).toEqual([14]);
    });

    it('leaves notes alone when the edit is not a pure split', () => {
        const clears = positionsToClearInheritedNotes(
            [source],
            [block(1, 'A different paragraph'), block(20, 'And another')],
        );

        expect(clears).toEqual([]);
    });

    it('does not clear a note that did not come from the edited line', () => {
        const clears = positionsToClearInheritedNotes(
            [source],
            [block(1, 'Hello'), block(30, 'Untouched', null, 'Other note')],
        );

        expect(clears).toEqual([]);
    });

    it('keeps a neighboring line note when another line is split', () => {
        const clears = positionsToClearInheritedNotes(
            [source, { key: 'line-2', text: 'Next', note: 'Stay' }],
            [
                block(1, 'Hello'),
                block(8, ' world'),
                block(20, 'Next', 'line-2', 'Stay'),
            ],
        );

        expect(clears).toEqual([8]);
    });

    it('keeps an unchanged noted line', () => {
        const clears = positionsToClearInheritedNotes(
            [source],
            [block(1, 'Hello world')],
        );

        expect(clears).toEqual([]);
    });
});
