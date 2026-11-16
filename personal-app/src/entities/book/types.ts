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
	/** Whether an uploaded PDF is attached to this book row. */
	hasFile?: boolean;
};

export type ReadingChunkType = 'para' | 'heading' | 'verse';
export type ReadingMood = 'espera' | 'polvo' | 'alerta' | 'niebla';

export type ReadingChunk = {
	id: string;
	type: ReadingChunkType;
	page: number;
	offset: number;
	text: string;
	mood: ReadingMood;
	cues: string[];
};

export type BookReadingDocument = {
	bookId: string;
	pdfPages: number;
	ocrPending: boolean;
	chunks: ReadingChunk[];
};

export type ReadingMark = {
	id: string;
	kind: 'underline' | 'note' | 'lexicon';
	ink?: 'aka' | 'bronce' | 'tinta';
	anchor: string;
	text?: string;
	note?: string;
};

export type ReadingWord = {
	term: string;
	trans?: string;
	anchor?: string;
};

export type ReadingProgress = {
	page: number;
	pct: number;
	chunkId?: string;
};

export type BookReadingState = {
	bookId: string;
	marks: ReadingMark[];
	words: ReadingWord[];
	progress: ReadingProgress;
};
