export type ProjectStatus = 'en-produccion' | 'en-construccion' | 'codigo-abierto';

export type ProjectIcon = 'sprout' | 'feather' | 'blocks' | 'wrench';

export type Project = {
	name: string;
	icon: ProjectIcon;
	tagline: string;
	description: string;
	stack: string[];
	status: ProjectStatus;
	statusLabel: string;
	repoUrl: string;
	demoUrl?: string;
	featured?: boolean;
};
