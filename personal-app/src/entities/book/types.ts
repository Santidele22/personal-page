export type ReadingStatus = 'reading' | 'finished' | 'queued';

export type Book = {
	id: number;
	title: string;
	author: string;
	description: string;
	status: ReadingStatus;
	statusLabel: string;
	review?: string;
	published: boolean;
};
