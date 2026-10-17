/** A hero commitment pair: the claim and what it means. */
export type ProfileCommitment = {
	value: string;
	label: string;
};

/**
 * The singleton site profile as the API returns it (`GET /profile`): every
 * editable column of the backend row, without its internal `id`. The backend
 * answers the current site copy when the table has no row yet, so the landing
 * only needs its own fallback when the request itself fails.
 */
export type Profile = {
	name: string;
	role: string;
	eyebrow: string;
	heroTitle: string;
	heroIntro: string;
	bioParagraphs: string[];
	/** One `Title: description` line per value, split by the About widget. */
	values: string[];
	commitments: ProfileCommitment[];
	siteName: string;
	siteTitle: string;
	siteDescription: string;
	siteAuthor: string;
	githubUrl: string;
	linkedinUrl: string;
	contactIntro: string;
	footerBlurb: string;
	/** Stored verbatim, year included. */
	footerCopyright: string;
};

/** `PUT /profile` accepts a partial body and merges it over the stored row. */
export type UpdateProfile = Partial<Profile>;
