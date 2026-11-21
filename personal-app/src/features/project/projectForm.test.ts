import { describe, expect, it } from 'vitest';

import { BASIC_TECHNOLOGIES } from '../../entities/project/technologies';
import type { AdminProjectRow } from './api/projects-admin';
import {
	EMPTY_PROJECT_FORM,
	PROJECT_ICON_OPTIONS,
	PROJECT_STATUS_OPTIONS,
	PROJECT_TYPE_OPTIONS,
	cleanTechnologies,
	extraTechnologies,
	projectCountLabel,
	projectFormToBody,
	projectStatusLabel,
	projectToForm,
	validateProjectForm,
} from './projectForm';
import type { ProjectFormState } from './projectForm';

const ROW: AdminProjectRow = {
	id: 7,
	url: 'https://ejemplo.dev',
	name: 'Portafolio',
	description: 'Una landing con proyectos.',
	technologies: ['Astro', 'TypeScript'],
	githubUrl: 'https://github.com/aegir/portafolio',
	ownerId: 'user-1',
	icon: 'sprout',
	tagline: 'Proyectos y lecturas.',
	status: 'en-produccion',
	type: 'full-stack',
	featured: true,
	forSale: false,
};

const VALID_FORM: ProjectFormState = {
	url: 'https://ejemplo.dev',
	name: 'Portafolio',
	description: 'Una landing con proyectos.',
	technologies: ['Astro', 'TypeScript'],
	githubUrl: 'https://github.com/aegir/portafolio',
	icon: 'sprout',
	tagline: 'Proyectos y lecturas.',
	status: 'en-produccion',
	type: 'full-stack',
	featured: true,
	forSale: false,
};

describe('projectStatusLabel', () => {
	it('maps the stored status keys to their Spanish labels', () => {
		expect(projectStatusLabel('en-produccion')).toBe('En producción');
		expect(projectStatusLabel('en-construccion')).toBe('En construcción');
		expect(projectStatusLabel('codigo-abierto')).toBe('Código abierto');
	});

	it('shows an unknown key as it comes', () => {
		expect(projectStatusLabel('en-pausa')).toBe('en-pausa');
		expect(projectStatusLabel('')).toBe('');
	});
});

describe('PROJECT_STATUS_OPTIONS', () => {
	it('lists the three stored statuses the editor offers', () => {
		expect(PROJECT_STATUS_OPTIONS).toEqual([
			{ value: 'en-produccion', label: 'En producción' },
			{ value: 'en-construccion', label: 'En construcción' },
			{ value: 'codigo-abierto', label: 'Código abierto' },
		]);
	});
});

describe('PROJECT_ICON_OPTIONS', () => {
	it('lists the four card icons with their labels', () => {
		expect(PROJECT_ICON_OPTIONS).toEqual([
			{ value: 'sprout', label: 'Brote' },
			{ value: 'feather', label: 'Pluma' },
			{ value: 'blocks', label: 'Bloques' },
			{ value: 'wrench', label: 'Llave' },
		]);
	});
});

describe('PROJECT_TYPE_OPTIONS', () => {
	it('lists the portfolio categories stored as free text', () => {
		expect(PROJECT_TYPE_OPTIONS).toEqual([
			{ value: 'full-stack', label: 'Full-stack' },
			{ value: 'backend', label: 'Backend' },
			{ value: 'frontend', label: 'Frontend' },
			{ value: 'auditoria', label: 'Auditoría' },
			{ value: 'web3', label: 'Web3' },
			{ value: 'sistemas', label: 'Sistemas / Linux' },
			{ value: 'juegos', label: 'Juegos' },
		]);
	});
});

describe('projectToForm', () => {
	it('maps a stored row into editable form state', () => {
		expect(projectToForm(ROW)).toEqual(VALID_FORM);
	});

	it('copies the stored technology list instead of sharing it', () => {
		const form = projectToForm(ROW);

		expect(form.technologies).toEqual(['Astro', 'TypeScript']);
		expect(form.technologies).not.toBe(ROW.technologies);
	});

	it('defaults every nullable card column to a blank field', () => {
		const row = {
			...ROW,
			githubUrl: null,
			icon: null,
			tagline: null,
			status: null,
			type: null,
			featured: null,
			technologies: [],
		} satisfies AdminProjectRow;

		expect(projectToForm(row)).toEqual({
			url: 'https://ejemplo.dev',
			name: 'Portafolio',
			description: 'Una landing con proyectos.',
			technologies: [],
			githubUrl: '',
			icon: '',
			tagline: '',
			status: '',
			type: '',
			featured: false,
			forSale: false,
		});
	});

	it('keeps a stored for-sale flag', () => {
		expect(projectToForm({ ...ROW, forSale: true }).forSale).toBe(true);
	});
});

describe('cleanTechnologies', () => {
	it('trims each id, drops the blanks, and keeps the selection order', () => {
		expect(cleanTechnologies([' Astro ', '', '  ', 'TypeScript'])).toEqual(['Astro', 'TypeScript']);
	});

	it('collapses duplicates without reordering', () => {
		expect(cleanTechnologies(['Go', 'Astro', 'Go ', 'Astro'])).toEqual(['Go', 'Astro']);
	});

	it('keeps ids the catalogue does not know', () => {
		expect(cleanTechnologies(['Backbone', 'Astro'])).toEqual(['Backbone', 'Astro']);
	});

	it('returns an empty list for an empty selection', () => {
		expect(cleanTechnologies([])).toEqual([]);
		expect(cleanTechnologies(['', '   '])).toEqual([]);
	});
});

describe('extraTechnologies', () => {
	it('returns only the stored ids the catalogue does not know', () => {
		expect(extraTechnologies(['Astro', 'Backbone', 'TypeScript', 'jQuery'])).toEqual([
			'Backbone',
			'jQuery',
		]);
	});

	it('drops blank ids, which have no chip', () => {
		expect(extraTechnologies(['', '  ', 'Backbone'])).toEqual(['Backbone']);
	});

	it('keeps the stored order of the extras', () => {
		expect(extraTechnologies(['Zeta', 'Alfa'])).toEqual(['Zeta', 'Alfa']);
	});

	it('returns nothing when every id is in the catalogue', () => {
		expect(extraTechnologies(['Astro', 'Go'])).toEqual([]);
		expect(extraTechnologies([])).toEqual([]);
	});

	it('treats every catalogue id as known', () => {
		for (const technology of BASIC_TECHNOLOGIES) {
			expect(extraTechnologies([technology.id])).toEqual([]);
		}
	});
});

describe('validateProjectForm', () => {
	it('returns null for a valid form', () => {
		expect(validateProjectForm(VALID_FORM)).toBeNull();
	});

	it('requires the project link', () => {
		const message = 'El proyecto necesita un enlace.';

		expect(validateProjectForm({ ...VALID_FORM, url: '' })).toBe(message);
		expect(validateProjectForm({ ...VALID_FORM, url: '   ' })).toBe(message);
	});

	it('requires a name', () => {
		const message = 'El proyecto necesita un nombre.';

		expect(validateProjectForm({ ...VALID_FORM, name: '' })).toBe(message);
		expect(validateProjectForm({ ...VALID_FORM, name: '  ' })).toBe(message);
	});

	it('requires a description', () => {
		const message = 'El proyecto necesita una descripción.';

		expect(validateProjectForm({ ...VALID_FORM, description: '' })).toBe(message);
		expect(validateProjectForm({ ...VALID_FORM, description: ' \n ' })).toBe(message);
	});

	it('rejects a repository that is not a full http(s) URL', () => {
		const message = 'El repositorio tiene que ser una URL completa, con https:// delante.';

		expect(validateProjectForm({ ...VALID_FORM, githubUrl: 'github.com/aegir' })).toBe(message);
		expect(validateProjectForm({ ...VALID_FORM, githubUrl: 'ftp://github.com/aegir' })).toBe(message);
		expect(validateProjectForm({ ...VALID_FORM, githubUrl: 'https://' })).toBeNull();
	});

	it('accepts an empty repository and both http prefixes', () => {
		expect(validateProjectForm({ ...VALID_FORM, githubUrl: '' })).toBeNull();
		expect(validateProjectForm({ ...VALID_FORM, githubUrl: '   ' })).toBeNull();
		expect(validateProjectForm({ ...VALID_FORM, githubUrl: 'https://github.com/aegir' })).toBeNull();
		expect(validateProjectForm({ ...VALID_FORM, githubUrl: 'http://github.com/aegir' })).toBeNull();
		expect(validateProjectForm({ ...VALID_FORM, githubUrl: 'HTTPS://github.com/aegir' })).toBeNull();
	});

	it('reports link, then name, then description, then repository', () => {
		expect(validateProjectForm(EMPTY_PROJECT_FORM)).toBe('El proyecto necesita un enlace.');
		expect(validateProjectForm({ ...EMPTY_PROJECT_FORM, url: 'https://ejemplo.dev' })).toBe(
			'El proyecto necesita un nombre.',
		);
		expect(
			validateProjectForm({ ...EMPTY_PROJECT_FORM, url: 'https://ejemplo.dev', name: 'Algo' }),
		).toBe('El proyecto necesita una descripción.');
		expect(
			validateProjectForm({
				...EMPTY_PROJECT_FORM,
				url: 'https://ejemplo.dev',
				name: 'Algo',
				description: 'Algo',
				githubUrl: 'github.com/aegir',
			}),
		).toBe('El repositorio tiene que ser una URL completa, con https:// delante.');
	});

	it('never rejects the optional card columns', () => {
		expect(
			validateProjectForm({
				...VALID_FORM,
				technologies: [],
				icon: '',
				tagline: '',
				status: '',
				type: '',
				featured: false,
				forSale: false,
			}),
		).toBeNull();
	});
});

describe('projectFormToBody', () => {
	it('trims the text columns and keeps the selected technologies', () => {
		expect(
			projectFormToBody({
				...VALID_FORM,
				url: '  https://ejemplo.dev  ',
				name: '  Portafolio  ',
				description: '  Una landing con proyectos.  ',
				technologies: [' Astro ', '', 'TypeScript', 'Astro'],
				githubUrl: '  https://github.com/aegir/portafolio  ',
				tagline: '  Proyectos y lecturas.  ',
				type: '  full-stack  ',
			}),
		).toEqual({
			url: 'https://ejemplo.dev',
			name: 'Portafolio',
			description: 'Una landing con proyectos.',
			technologies: ['Astro', 'TypeScript'],
			githubUrl: 'https://github.com/aegir/portafolio',
			icon: 'sprout',
			tagline: 'Proyectos y lecturas.',
			status: 'en-produccion',
			type: 'full-stack',
			featured: true,
			forSale: false,
		});
	});

	it('sends null for every empty optional column', () => {
		const body = projectFormToBody({
			...VALID_FORM,
			githubUrl: '   ',
			tagline: '',
			type: '  ',
		});

		expect(body.githubUrl).toBeNull();
		expect(body.tagline).toBeNull();
		expect(body.type).toBeNull();
	});

	it('sends null for an icon or status key the card cannot render', () => {
		const body = projectFormToBody({ ...VALID_FORM, icon: 'rocket', status: 'en-pausa' });

		expect(body.icon).toBeNull();
		expect(body.status).toBeNull();
	});

	it('sends null for the empty icon and status options', () => {
		const body = projectFormToBody({ ...VALID_FORM, icon: '', status: '' });

		expect(body.icon).toBeNull();
		expect(body.status).toBeNull();
	});

	it('keeps every catalogue icon and status key', () => {
		for (const option of PROJECT_ICON_OPTIONS) {
			expect(projectFormToBody({ ...VALID_FORM, icon: option.value }).icon).toBe(option.value);
		}

		for (const option of PROJECT_STATUS_OPTIONS) {
			expect(projectFormToBody({ ...VALID_FORM, status: option.value }).status).toBe(option.value);
		}
	});

	it('sends an empty technology list when nothing is selected', () => {
		expect(projectFormToBody({ ...VALID_FORM, technologies: ['', ' '] }).technologies).toEqual([]);
	});

	it('keeps a free-text type the catalogue does not know', () => {
		expect(projectFormToBody({ ...VALID_FORM, type: 'datos' }).type).toBe('datos');
	});

	it('sends the two card flags as booleans', () => {
		const body = projectFormToBody({ ...VALID_FORM, featured: false, forSale: true });

		expect(body.featured).toBe(false);
		expect(body.forSale).toBe(true);
	});
});

describe('projectCountLabel', () => {
	it('uses the singular for exactly one project', () => {
		expect(projectCountLabel(1)).toBe('proyecto');
	});

	it('uses the plural for zero and many projects', () => {
		expect(projectCountLabel(0)).toBe('proyectos');
		expect(projectCountLabel(2)).toBe('proyectos');
	});
});
