import { countWordsInHtml, manuscriptWordsAdded } from '@/lib/editor/wordCount';

describe('countWordsInHtml', () => {
    it('counts manuscript text and ignores markup', () => {
        const html = '<h1>Chapter 1</h1><p>The train arrived.</p>';
        expect(countWordsInHtml(html)).toBe(5);
    });

    it('does not count a margin note, including one that contains ">"', () => {
        const html = '<p data-line-note="see the > symbol and then many extra note words that should not count">actual text</p><p>next line</p>';
        expect(countWordsInHtml(html)).toBe(4);
    });

    it('treats non-breaking spaces as word breaks', () => {
        expect(countWordsInHtml('<p>hello&nbsp;world</p>')).toBe(2);
    });

    it('keeps a comparison in the prose', () => {
        expect(countWordsInHtml('<p>a < b today</p>')).toBe(4);
    });

    it('counts an empty document as zero', () => {
        expect(countWordsInHtml('')).toBe(0);
        expect(countWordsInHtml('<p></p>')).toBe(0);
    });
});

describe('manuscriptWordsAdded', () => {
    it('excludes pasted words and ignores deletions', () => {
        expect(manuscriptWordsAdded('<p>one two</p>', '<p>one two three four</p>', 2)).toBe(0);
        expect(manuscriptWordsAdded('<p>one two three</p>', '<p>one</p>', 0)).toBe(0);
    });
});
