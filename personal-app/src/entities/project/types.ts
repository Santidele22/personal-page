export type ProjectStatus = 'en-produccion' | 'en-construccion' | 'codigo-abierto';

export type ProjectIcon = 'sprout' | 'feather' | 'blocks' | 'wrench';

/** Portfolio category keys stored in the `projects.type` column. */
export type ProjectType = 'full-stack' | 'backend' | 'frontend' | 'auditoria' | 'web3';

export type Project = {
	name: string;
	icon: ProjectIcon;
	tagline: string;
	description: string;
	stack: string[];
	status: ProjectStatus;
	statusLabel: string;
	/** Stored category key; `null` when the project has none. */
	type: ProjectType | string | null;
	/** Rendered category label; `null` renders no chip. */
	typeLabel: string | null;
	repoUrl: string;
	demoUrl?: string;
	featured?: boolean;
	forSale?: boolean;
};
