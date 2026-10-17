export type ProjectStatus = 'en-produccion' | 'en-construccion' | 'codigo-abierto';

export type Project = {
	name: string;
	icon: 'sprout' | 'feather' | 'blocks' | 'wrench';
	tagline: string;
	description: string;
	stack: string[];
	status: ProjectStatus;
	statusLabel: string;
	repoUrl: string;
	demoUrl?: string;
	featured?: boolean;
};
