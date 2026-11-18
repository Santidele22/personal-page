import { safeHref } from '../../shared/api/url';
import type { Profile, ProfileCommitment } from './types';

/**
 * Pure form helpers for the singleton profile admin panel: the editable shape,
 * the empty defaults, the stored record ↔ form mappers, and the line/textarea
 * conversions of its three list columns (bio paragraphs, values, commitments).
 * No DOM and no requests here.
 *
 * The panel ships no client-side validation (S5): every column is optional, the
 * backend merges whatever changed, and the panel answers a refused save with its
 * own Spanish copy, so there are no per-field validation messages to reuse.
 */

/** One VALUE row; the API still stores it as a single `Title: description` line. */
export type ProfileValueForm = {
	title: string;
	description: string;
};

export type ProfileFormState = {
	name: string;
	role: string;
	eyebrow: string;
	heroTitle: string;
	heroIntro: string;
	/** One paragraph per line. */
	bioParagraphs: string;
	/** One `title`/`description` pair per row. */
	values: ProfileValueForm[];
	commitments: ProfileCommitment[];
	siteName: string;
	siteTitle: string;
	siteDescription: string;
	siteAuthor: string;
	githubUrl: string;
	linkedinUrl: string;
	contactIntro: string;
	footerBlurb: string;
	footerCopyright: string;
};

export const EMPTY_PROFILE_FORM: ProfileFormState = {
	name: '',
	role: '',
	eyebrow: '',
	heroTitle: '',
	heroIntro: '',
	bioParagraphs: '',
	values: [],
	commitments: [],
	siteName: '',
	siteTitle: '',
	siteDescription: '',
	siteAuthor: '',
	githubUrl: '',
	linkedinUrl: '',
	contactIntro: '',
	footerBlurb: '',
	footerCopyright: '',
};

export type ProfileEditorStatus = 'loading' | 'ready' | 'error';
export type ProfileEditorPending = null | 'draft' | 'publish' | 'discard';
export type ProfileEditorFeedback = 'idle' | 'draftSaved' | 'published' | 'discarded' | 'error';

/** Textarea text → list, dropping the blank lines used as separators. */
export function bioTextToLines(text: string): string[] {
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/** Bio paragraphs (stored list) → the textarea text: one paragraph per line. */
export function bioLinesToText(lines: string[]): string {
	return lines.join('\n');
}

/**
 * Stored `Title: description` line → pair. Each line is split on its FIRST colon
 * only, so a colon inside the description survives untouched; a line without a
 * colon keeps all its text as the title and an empty description.
 */
export function valuesToForm(lines: string[]): ProfileValueForm[] {
	return lines.map((line) => {
		const separator = line.indexOf(':');

		if (separator === -1) {
			return { title: line, description: '' };
		}

		return {
			title: line.slice(0, separator),
			description: line.slice(separator + 1).trimStart(),
		};
	});
}

/**
 * Pair list → the `string[]` the API stores, one `title: description` line each.
 * Rows with an empty title and description are dropped, and a row without a
 * description keeps only its title, so the values already stored round-trip.
 */
export function valuesFromForm(values: ProfileValueForm[]): string[] {
	return values
		.map((item) => ({ title: item.title.trim(), description: item.description.trim() }))
		.filter((item) => item.title || item.description)
		.map((item) => (item.description ? `${item.title}: ${item.description}` : item.title));
}

/** Stored commitments → editable rows (copies, so the form never aliases the loaded record). */
export function commitmentsToForm(commitments: ProfileCommitment[]): ProfileCommitment[] {
	return commitments.map((item) => ({ ...item }));
}

/** Editable rows → the list the API stores, dropping the fully blank ones. */
export function commitmentsFromForm(commitments: ProfileCommitment[]): ProfileCommitment[] {
	return commitments
		.map((item) => ({ value: item.value.trim(), label: item.label.trim() }))
		.filter((item) => item.value || item.label);
}

/** Maps the stored singleton into editable form fields. */
export function profileToForm(profile: Profile): ProfileFormState {
	return {
		name: profile.name,
		role: profile.role,
		eyebrow: profile.eyebrow,
		heroTitle: profile.heroTitle,
		heroIntro: profile.heroIntro,
		bioParagraphs: bioLinesToText(profile.bioParagraphs),
		values: valuesToForm(profile.values),
		commitments: commitmentsToForm(profile.commitments),
		siteName: profile.siteName,
		siteTitle: profile.siteTitle,
		siteDescription: profile.siteDescription,
		siteAuthor: profile.siteAuthor,
		githubUrl: profile.githubUrl,
		linkedinUrl: profile.linkedinUrl,
		contactIntro: profile.contactIntro,
		footerBlurb: profile.footerBlurb,
		footerCopyright: profile.footerCopyright,
	};
}

/** Form state → the profile the panel diffs and sends as a (partial) body. */
export function profileFormToBody(form: ProfileFormState): Profile {
	return {
		name: form.name,
		role: form.role,
		eyebrow: form.eyebrow,
		heroTitle: form.heroTitle,
		heroIntro: form.heroIntro,
		bioParagraphs: bioTextToLines(form.bioParagraphs),
		values: valuesFromForm(form.values),
		commitments: commitmentsFromForm(form.commitments),
		siteName: form.siteName,
		siteTitle: form.siteTitle,
		siteDescription: form.siteDescription,
		siteAuthor: form.siteAuthor,
		githubUrl: form.githubUrl,
		linkedinUrl: form.linkedinUrl,
		contactIntro: form.contactIntro,
		footerBlurb: form.footerBlurb,
		footerCopyright: form.footerCopyright,
	};
}

/**
 * The admin-only draft read is raw, so its social columns need the same
 * `safeHref` pass `fetchProfile` already applies: a foreign scheme never
 * reaches the form. `null` stays `null` (no stored draft).
 */
export function normalizeProfileDraft(draft: Profile | null): Profile | null {
	if (!draft) return null;

	return {
		...draft,
		githubUrl: safeHref(draft.githubUrl) ?? '',
		linkedinUrl: safeHref(draft.linkedinUrl) ?? '',
	};
}
