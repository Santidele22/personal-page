/**
 * The hanko monogram of a recommendation card: the initials of the first and
 * last name («Carlos Fabian Lencina» → «CL»), uppercased. An empty name
 * yields a middle dot instead of an empty seal.
 */
export function initialsFromName(authorName: string): string {
	const parts = authorName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '·';

	const first = parts[0].charAt(0);
	const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';

	return `${first}${last}`.toUpperCase();
}

/**
 * The card excerpt of a long quote (artboard 04): the first `maxSentences`
 * sentences followed by an ellipsis. Quotes that already fit are returned
 * untouched, without ellipsis. A period only counts as a sentence boundary
 * when the next sentence starts (uppercase, «¿», digit or opening quote), so
 * abbreviations like «Jr.» never split a sentence in half.
 */
export function excerptQuote(quote: string, maxSentences = 2): string {
	const text = quote.trim();
	if (!text) return '';

	const boundary = /[.!?]+(?=\s+[A-ZÁÉÍÓÚÑ¿«"0-9])/g;
	let end = -1;
	let found = 0;
	let match: RegExpExecArray | null;
	while ((match = boundary.exec(text)) !== null) {
		found += 1;
		if (found === maxSentences) {
			end = match.index + match[0].length;
			break;
		}
	}
	if (end === -1) return text;

	return `${text.slice(0, end)} …`;
}
