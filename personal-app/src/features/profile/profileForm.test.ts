import { describe, expect, it } from 'vitest';

import {
	EMPTY_PROFILE_FORM,
	bioLinesToText,
	bioTextToLines,
	commitmentsFromForm,
	commitmentsToForm,
	normalizeProfileDraft,
	profileFormToBody,
	profileToForm,
	valuesFromForm,
	valuesToForm,
} from './profileForm';
import type { Profile } from './types';

const storedProfile: Profile = {
	name: 'Aegir',
	role: 'Ingeniero de software',
	eyebrow: 'Portafolio',
	heroTitle: 'Escribo software que aguanta.',
	heroIntro: 'Trabajo con sistemas distribuidos.',
	bioParagraphs: ['Primer párrafo.', 'Segundo párrafo.'],
	values: ['Claridad: menos ruido', 'Oficio'],
	commitments: [{ value: '12', label: 'años construyendo' }],
	siteName: 'Aegir',
	siteTitle: 'Aegir · portafolio',
	siteDescription: 'Portafolio y lecturas.',
	siteAuthor: 'Aegir',
	githubUrl: 'https://github.com/aegir',
	linkedinUrl: 'https://linkedin.com/in/aegir',
	contactIntro: 'Escribime.',
	footerBlurb: 'Hecho a mano.',
	footerCopyright: '© 2025 Aegir',
};

describe('EMPTY_PROFILE_FORM', () => {
	it('starts every text column blank and both lists empty', () => {
		expect(EMPTY_PROFILE_FORM.name).toBe('');
		expect(EMPTY_PROFILE_FORM.footerCopyright).toBe('');
		expect(EMPTY_PROFILE_FORM.bioParagraphs).toBe('');
		expect(EMPTY_PROFILE_FORM.values).toEqual([]);
		expect(EMPTY_PROFILE_FORM.commitments).toEqual([]);
	});
});

describe('bioTextToLines', () => {
	it('splits on newlines, trims each line, and drops the blank separators', () => {
		expect(bioTextToLines('  Uno. \n\n Dos.  \n   \nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.']);
	});

	it('answers an empty list for blank text', () => {
		expect(bioTextToLines('')).toEqual([]);
		expect(bioTextToLines('   \n  \n')).toEqual([]);
	});
});

describe('bioLinesToText', () => {
	it('joins the stored paragraphs one per line', () => {
		expect(bioLinesToText(['Uno.', 'Dos.'])).toBe('Uno.\nDos.');
		expect(bioLinesToText([])).toBe('');
	});
});

describe('valuesToForm', () => {
	it('splits each stored line on its first colon only', () => {
		expect(valuesToForm(['Claridad: menos ruido: y más foco'])).toEqual([
			{ title: 'Claridad', description: 'menos ruido: y más foco' },
		]);
	});

	it('keeps a line without a colon as the title with an empty description', () => {
		expect(valuesToForm(['Oficio'])).toEqual([{ title: 'Oficio', description: '' }]);
	});

	it('answers an empty list for no stored values', () => {
		expect(valuesToForm([])).toEqual([]);
	});
});

describe('valuesFromForm', () => {
	it('joins a row back into one `title: description` line', () => {
		expect(valuesFromForm([{ title: 'Claridad', description: 'menos ruido' }])).toEqual([
			'Claridad: menos ruido',
		]);
	});

	it('trims both sides and keeps a title-only row without the separator', () => {
		expect(valuesFromForm([{ title: '  Oficio ', description: '  ' }])).toEqual(['Oficio']);
	});

	it('drops rows that are blank on both sides', () => {
		expect(
			valuesFromForm([
				{ title: '', description: '   ' },
				{ title: 'Claridad', description: 'menos ruido' },
			]),
		).toEqual(['Claridad: menos ruido']);
	});

	it('round-trips the stored values of the profile', () => {
		expect(valuesFromForm(valuesToForm(storedProfile.values))).toEqual(storedProfile.values);
	});
});

describe('commitmentsToForm', () => {
	it('copies each stored commitment so the form never aliases the record', () => {
		const stored = [{ value: '12', label: 'años' }];
		const rows = commitmentsToForm(stored);

		expect(rows).toEqual(stored);
		expect(rows[0]).not.toBe(stored[0]);
	});
});

describe('commitmentsFromForm', () => {
	it('trims both columns and drops the fully blank rows', () => {
		expect(
			commitmentsFromForm([
				{ value: ' 12 ', label: ' años ' },
				{ value: '   ', label: '' },
			]),
		).toEqual([{ value: '12', label: 'años' }]);
	});

	it('keeps a row with only one filled column', () => {
		expect(commitmentsFromForm([{ value: '', label: 'años' }])).toEqual([
			{ value: '', label: 'años' },
		]);
	});
});

describe('profileToForm', () => {
	it('maps the stored singleton into editable form state', () => {
		expect(profileToForm(storedProfile)).toEqual({
			name: 'Aegir',
			role: 'Ingeniero de software',
			eyebrow: 'Portafolio',
			heroTitle: 'Escribo software que aguanta.',
			heroIntro: 'Trabajo con sistemas distribuidos.',
			bioParagraphs: 'Primer párrafo.\nSegundo párrafo.',
			values: [
				{ title: 'Claridad', description: 'menos ruido' },
				{ title: 'Oficio', description: '' },
			],
			commitments: [{ value: '12', label: 'años construyendo' }],
			siteName: 'Aegir',
			siteTitle: 'Aegir · portafolio',
			siteDescription: 'Portafolio y lecturas.',
			siteAuthor: 'Aegir',
			githubUrl: 'https://github.com/aegir',
			linkedinUrl: 'https://linkedin.com/in/aegir',
			contactIntro: 'Escribime.',
			footerBlurb: 'Hecho a mano.',
			footerCopyright: '© 2025 Aegir',
		});
	});
});

describe('profileFormToBody', () => {
	it('maps the form back into the profile the panel diffs and sends', () => {
		expect(profileFormToBody(profileToForm(storedProfile))).toEqual(storedProfile);
	});

	it('drops the blank list entries the editor lets the admin leave behind', () => {
		const body = profileFormToBody({
			...EMPTY_PROFILE_FORM,
			name: 'Aegir',
			bioParagraphs: 'Uno.\n\n   \nDos.',
			values: [{ title: '', description: '' }],
			commitments: [{ value: ' ', label: '' }],
		});

		expect(body.name).toBe('Aegir');
		expect(body.bioParagraphs).toEqual(['Uno.', 'Dos.']);
		expect(body.values).toEqual([]);
		expect(body.commitments).toEqual([]);
	});
});

describe('normalizeProfileDraft', () => {
	it('keeps a null draft null', () => {
		expect(normalizeProfileDraft(null)).toBeNull();
	});

	it('drops a social URL whose scheme is not safe and keeps the http(s) ones', () => {
		const normalized = normalizeProfileDraft({
			...storedProfile,
			githubUrl: 'javascript:alert(1)',
			linkedinUrl: 'https://linkedin.com/in/aegir',
		});

		expect(normalized?.githubUrl).toBe('');
		expect(normalized?.linkedinUrl).toBe('https://linkedin.com/in/aegir');
	});

	it('leaves the other columns untouched, like the inline normalization it replaces', () => {
		const normalized = normalizeProfileDraft(storedProfile);

		expect(normalized).toEqual(storedProfile);
		expect(normalized?.name).toBe(storedProfile.name);
		expect(normalized?.bioParagraphs).toBe(storedProfile.bioParagraphs);
	});
});
