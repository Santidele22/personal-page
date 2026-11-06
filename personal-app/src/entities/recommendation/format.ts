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
