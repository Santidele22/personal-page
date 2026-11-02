import { describe, expect, it } from 'vitest';
import { changedProfileFields } from './profile';
import type { Profile } from '../types';

const profile: Profile = {
	name: 'Santiago',
	role: 'Backend',
	eyebrow: 'SANTIAGO',
	heroTitle: 'Título',
	heroIntro: 'Intro',
	bioParagraphs: ['Bio'],
	values: ['Calma: Trabajo despacio'],
	commitments: [{ value: 'Año 1', label: 'el diario recién empieza' }],
	siteName: 'devlog.',
	siteTitle: 'Sitio',
	siteDescription: 'Descripción',
	siteAuthor: 'Santiago',
	githubUrl: 'https://github.com/Santidele22',
	linkedinUrl: 'https://linkedin.com/in/santiago',
	contactIntro: 'Contacto',
	footerBlurb: 'Pie',
	footerCopyright: '© 2026',
};

describe('changedProfileFields', () => {
	it('returns only the changed scalar field', () => {
		expect(changedProfileFields(profile, { ...profile, heroIntro: 'Nueva intro' })).toEqual({
			heroIntro: 'Nueva intro',
		});
	});

	it('detects changes inside arrays and omits identical fields', () => {
		const current = {
			...profile,
			commitments: [{ value: 'Año 2', label: 'el diario recién empieza' }],
		};

		expect(changedProfileFields(profile, current)).toEqual({
			commitments: current.commitments,
		});
	});

	it('returns an empty body when nothing changed', () => {
		expect(changedProfileFields(profile, { ...profile })).toEqual({});
	});
});
