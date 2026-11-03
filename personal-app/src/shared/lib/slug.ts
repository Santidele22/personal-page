/**
 * Slug for a `view-transition-name` (issue 47 S11): the value must be a valid
 * CSS identifier — no spaces, no accents, no punctuation — or the browser
 * drops the whole declaration and the element never joins the transition.
 * Entity display names arrive free-form («Proyecto 1», «Mentoría 1:1»), so the
 * card components slug them before composing the transition name.
 */
export function transitionNameSlug(value: string): string {
	const slug = value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'item';
}
