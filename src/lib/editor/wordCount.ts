/**
 * Count words in HTML manuscript content.
 * Tags are removed in full, including quoted attribute values, so a margin
 * note in `data-line-note` is not counted even when the note contains ">".
 * A `<[^>]*>` strip ends at that character and would count the rest of the note.
 */
export function countWordsInHtml(html: string): number {
    if (!html) return 0;
    const text = decodeWordEntities(stripHtmlTags(html)).replace(/\s+/g, ' ').trim();
    if (!text) return 0;
    return text.split(' ').length;
}

/**
 * Words to credit toward a writing goal for one save.
 * Pasted words are not credited. A shorter document adds nothing.
 */
export function manuscriptWordsAdded(
    previousHtml: string,
    nextHtml: string,
    pastedWords: number,
): number {
    const delta = countWordsInHtml(nextHtml) - countWordsInHtml(previousHtml);
    if (delta <= 0) return 0;
    const excluded = pastedWords > 0 ? pastedWords : 0;
    return delta > excluded ? delta - excluded : 0;
}

/**
 * Count words in plain text. Used for pasted content.
 */
export function countWordsInPlainText(text: string): number {
    if (!text) return 0;
    const words = text
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter((word) => word.length > 0);
    return words.length;
}

function isTagStart(html: string, index: number): boolean {
    const next = html[index + 1];
    if (!next) return false;
    return next === '/' || next === '!' || next === '?' || (next >= 'A' && next <= 'Z') || (next >= 'a' && next <= 'z');
}

/**
 * Replace tags with spaces without treating ">" inside a quoted attribute as the end of the tag.
 */
function stripHtmlTags(html: string): string {
    let out = '';
    let index = 0;
    while (index < html.length) {
        const tagStart = html.indexOf('<', index);
        if (tagStart === -1) {
            out += html.slice(index);
            break;
        }
        out += html.slice(index, tagStart);
        if (!isTagStart(html, tagStart)) {
            out += '<';
            index = tagStart + 1;
            continue;
        }
        out += ' ';
        if (html.startsWith('<!--', tagStart)) {
            const commentEnd = html.indexOf('-->', tagStart + 4);
            index = commentEnd === -1 ? html.length : commentEnd + 3;
            continue;
        }
        index = endOfTag(html, tagStart);
    }
    return out;
}

function endOfTag(html: string, tagStart: number): number {
    let quote: '"' | "'" | null = null;
    for (let index = tagStart + 1; index < html.length; index += 1) {
        const character = html[index];
        if (quote) {
            if (character === quote) quote = null;
            continue;
        }
        if (character === '"' || character === "'") {
            quote = character;
            continue;
        }
        if (character === '>') return index + 1;
    }
    return html.length;
}

function decodeWordEntities(text: string): string {
    return text
        .replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'");
}
