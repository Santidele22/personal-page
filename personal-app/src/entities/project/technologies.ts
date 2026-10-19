/**
 * Catalog of the technologies the admin toggles in the projects editor.
 *
 * `id` is the stored string: it travels verbatim in `technologies` (the same
 * column `GET /projects` serves and the portada renders), so a toggled chip
 * stores exactly what the landing shows. `label` is the display name of the
 * chip; both fields coincide today because technology brands do not translate,
 * and they are split so a later alias can store one id while showing a
 * friendlier label.
 *
 * The list is alphabetical by label. Stored rows may carry values outside this
 * catalog (free text written before the toggle list existed): the editor shows
 * those as extra toggles instead of dropping them.
 */

export type Technology = {
	/** Stored value, sent as-is inside `technologies`. */
	id: string;
	/** Display name of the toggle chip. */
	label: string;
};

export const BASIC_TECHNOLOGIES: Technology[] = [
	{ id: 'Astro', label: 'Astro' },
	{ id: 'Django', label: 'Django' },
	{ id: 'Docker', label: 'Docker' },
	{ id: 'Express', label: 'Express' },
	{ id: 'FastAPI', label: 'FastAPI' },
	{ id: 'Git', label: 'Git' },
	{ id: 'GitHub Actions', label: 'GitHub Actions' },
	{ id: 'Go', label: 'Go' },
	{ id: 'JavaScript', label: 'JavaScript' },
	{ id: 'Kubernetes', label: 'Kubernetes' },
	{ id: 'MongoDB', label: 'MongoDB' },
	{ id: 'MySQL', label: 'MySQL' },
	{ id: 'NestJS', label: 'NestJS' },
	{ id: 'Node.js', label: 'Node.js' },
	{ id: 'PostgreSQL', label: 'PostgreSQL' },
	{ id: 'Python', label: 'Python' },
	{ id: 'React', label: 'React' },
	{ id: 'Redis', label: 'Redis' },
	{ id: 'Rust', label: 'Rust' },
	{ id: 'Solid', label: 'Solid' },
	{ id: 'SQLite', label: 'SQLite' },
	{ id: 'Tailwind CSS', label: 'Tailwind CSS' },
	{ id: 'TypeScript', label: 'TypeScript' },
	{ id: 'Vue', label: 'Vue' },
];
