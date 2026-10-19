export type ReadingStatus = 'reading' | 'finished' | 'queued';

/** Which landing shelf the book renders on (issue 23). */
export type BookKind = 'tecnico' | 'no_tecnico';

export type Book = {
	id: number;
	title: string;
	author: string;
	description: string;
	status: ReadingStatus;
	statusLabel: string;
	/** Landing shelf: defaults to `no_tecnico` when the API omits it. */
	kind: BookKind;
	review?: string;
	published: boolean;
};
