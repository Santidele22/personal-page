import { describe, expect, it } from 'vitest';

import type { AdminRoadmapMilestoneRow, AdminRoadmapStageRow } from './api/roadmap-admin';
import {
	EMPTY_MILESTONE_FORM,
	EMPTY_STAGE_FORM,
	ROADMAP_MILESTONE_STATUS_OPTIONS,
	ROADMAP_STAGE_STATE_OPTIONS,
	milestoneFormToBody,
	milestoneToForm,
	readPosition,
	readProgress,
	roadmapMilestoneStatusLabel,
	roadmapStageStateLabel,
	splitTechs,
	stageFormToBody,
	stageToForm,
	validateMilestoneForm,
	validateStageForm,
} from './roadmapForm';

const STAGE_ROW: AdminRoadmapStageRow = {
	id: 3,
	title: 'Backend II',
	summary: 'APIs, colas y despliegue.',
	techs: ['NestJS', 'PostgreSQL'],
	state: 'now',
	progress: 40,
	position: 2,
};

const STAGE_ROW_WITH_JSON_TECHS: AdminRoadmapStageRow = {
	...STAGE_ROW,
	id: 4,
	techs: '["Solidity","EVM"]',
};

const MILESTONE_ROW: AdminRoadmapMilestoneRow = {
	id: 9,
	quarter: 'Q3 · 2026',
	title: 'Primer contrato auditado',
	summary: 'Auditoría externa cerrada.',
	status: 'planned',
	position: 1,
};

describe('roadmapStageStateLabel', () => {
	it('maps the stored stage states to their Spanish labels', () => {
		expect(roadmapStageStateLabel('done')).toBe('Completada');
		expect(roadmapStageStateLabel('now')).toBe('En curso');
		expect(roadmapStageStateLabel('next')).toBe('Próxima');
	});

	it('shows an unknown state as it comes', () => {
		expect(roadmapStageStateLabel('paused')).toBe('paused');
		expect(roadmapStageStateLabel('')).toBe('');
	});
});

describe('roadmapMilestoneStatusLabel', () => {
	it('maps the stored milestone statuses to their Spanish labels', () => {
		expect(roadmapMilestoneStatusLabel('now')).toBe('Ahora');
		expect(roadmapMilestoneStatusLabel('planned')).toBe('Planificado');
	});

	it('shows an unknown status as it comes', () => {
		expect(roadmapMilestoneStatusLabel('later')).toBe('later');
	});
});

describe('ROADMAP_STAGE_STATE_OPTIONS', () => {
	it('lists the three stage states in the editor order', () => {
		expect(ROADMAP_STAGE_STATE_OPTIONS).toEqual([
			{ value: 'done', label: 'Completada' },
			{ value: 'now', label: 'En curso' },
			{ value: 'next', label: 'Próxima' },
		]);
	});
});

describe('ROADMAP_MILESTONE_STATUS_OPTIONS', () => {
	it('lists the two milestone statuses in the editor order', () => {
		expect(ROADMAP_MILESTONE_STATUS_OPTIONS).toEqual([
			{ value: 'now', label: 'Ahora' },
			{ value: 'planned', label: 'Planificado' },
		]);
	});
});

describe('EMPTY_STAGE_FORM', () => {
	it('starts a new stage as the next one at 0% with no position', () => {
		expect(EMPTY_STAGE_FORM).toEqual({
			title: '',
			summary: '',
			techs: '',
			state: 'next',
			progress: '0',
			position: '',
		});
	});
});

describe('EMPTY_MILESTONE_FORM', () => {
	it('starts a new milestone as planned with no position', () => {
		expect(EMPTY_MILESTONE_FORM).toEqual({
			quarter: '',
			title: '',
			summary: '',
			status: 'planned',
			position: '',
		});
	});
});

describe('readProgress', () => {
	it('accepts the 0–100 integer range and ignores surrounding blanks', () => {
		expect(readProgress('0')).toBe(0);
		expect(readProgress(' 42 ')).toBe(42);
		expect(readProgress('100')).toBe(100);
	});

	it('refuses blank, out-of-range, decimal and non-numeric text', () => {
		expect(readProgress('')).toBe('invalid');
		expect(readProgress('   ')).toBe('invalid');
		expect(readProgress('-1')).toBe('invalid');
		expect(readProgress('101')).toBe('invalid');
		expect(readProgress('12.5')).toBe('invalid');
		expect(readProgress('casi')).toBe('invalid');
	});
});

describe('readPosition', () => {
	it('keeps a blank position blank and reads non-negative integers', () => {
		expect(readPosition('')).toBeNull();
		expect(readPosition('  ')).toBeNull();
		expect(readPosition('0')).toBe(0);
		expect(readPosition(' 3 ')).toBe(3);
	});

	it('refuses negative, decimal and non-numeric text', () => {
		expect(readPosition('-2')).toBe('invalid');
		expect(readPosition('2.5')).toBe('invalid');
		expect(readPosition('arriba')).toBe('invalid');
	});
});

describe('splitTechs', () => {
	it('splits the comma-separated text and trims every entry', () => {
		expect(splitTechs('Solidity, EVM')).toEqual(['Solidity', 'EVM']);
		expect(splitTechs(' a ,, b ')).toEqual(['a', 'b']);
	});

	it('answers an empty list for blank text', () => {
		expect(splitTechs('')).toEqual([]);
		expect(splitTechs(' , , ')).toEqual([]);
	});
});

describe('stageToForm', () => {
	it('maps a stored stage into editable form state', () => {
		expect(stageToForm(STAGE_ROW)).toEqual({
			title: 'Backend II',
			summary: 'APIs, colas y despliegue.',
			techs: 'NestJS, PostgreSQL',
			state: 'now',
			progress: '40',
			position: '2',
		});
	});

	it('joins a techs column still serialised as JSON', () => {
		expect(stageToForm(STAGE_ROW_WITH_JSON_TECHS).techs).toBe('Solidity, EVM');
	});

	it('leaves the techs field empty when the column cannot be read', () => {
		expect(stageToForm({ ...STAGE_ROW, techs: 'no-es-json' }).techs).toBe('');
		expect(stageToForm({ ...STAGE_ROW, techs: [] }).techs).toBe('');
	});
});

describe('stageFormToBody', () => {
	it('trims the text, splits the techs and sends the typed position', () => {
		expect(
			stageFormToBody({
				title: '  Backend II  ',
				summary: '  APIs, colas y despliegue.  ',
				techs: ' NestJS, PostgreSQL ',
				state: 'done',
				progress: '100',
				position: '4',
			}),
		).toEqual({
			title: 'Backend II',
			summary: 'APIs, colas y despliegue.',
			techs: ['NestJS', 'PostgreSQL'],
			state: 'done',
			progress: 100,
			position: 4,
		});
	});

	it('omits the position when the admin leaves it blank or unreadable', () => {
		const body = stageFormToBody({ ...EMPTY_STAGE_FORM, title: 'Etapa', summary: 'Resumen' });
		expect(body).not.toHaveProperty('position');
		expect('position' in body).toBe(false);

		const invalid = stageFormToBody({ ...EMPTY_STAGE_FORM, title: 'Etapa', summary: 'Resumen', position: 'x' });
		expect('position' in invalid).toBe(false);
	});

	it('clamps an unreadable progress to 0', () => {
		expect(stageFormToBody({ ...EMPTY_STAGE_FORM, progress: '101' }).progress).toBe(0);
		expect(stageFormToBody({ ...EMPTY_STAGE_FORM, progress: '' }).progress).toBe(0);
	});
});

describe('validateStageForm', () => {
	it('answers null for a complete stage', () => {
		expect(validateStageForm(stageToForm(STAGE_ROW))).toBeNull();
		expect(validateStageForm({ ...EMPTY_STAGE_FORM, title: 'Etapa', summary: 'Resumen' })).toBeNull();
	});

	it('asks for the title, the summary, the 0–100 progress and the position', () => {
		expect(validateStageForm(EMPTY_STAGE_FORM)).toBe('La etapa necesita un título.');
		expect(validateStageForm({ ...EMPTY_STAGE_FORM, title: 'Etapa' })).toBe(
			'La etapa necesita un resumen.',
		);
		expect(validateStageForm({ ...EMPTY_STAGE_FORM, title: 'Etapa', summary: 'Resumen', progress: '120' })).toBe(
			'El progreso tiene que ser un número entero entre 0 y 100.',
		);
		expect(
			validateStageForm({ ...EMPTY_STAGE_FORM, title: 'Etapa', summary: 'Resumen', position: '-1' }),
		).toBe('La posición tiene que ser un número entero igual o mayor que cero.');
	});

	it('refuses a blank progress instead of guessing a value', () => {
		expect(validateStageForm({ ...EMPTY_STAGE_FORM, title: 'Etapa', summary: 'Resumen', progress: '' })).toBe(
			'El progreso tiene que ser un número entero entre 0 y 100.',
		);
	});
});

describe('milestoneToForm', () => {
	it('maps a stored milestone into editable form state', () => {
		expect(milestoneToForm(MILESTONE_ROW)).toEqual({
			quarter: 'Q3 · 2026',
			title: 'Primer contrato auditado',
			summary: 'Auditoría externa cerrada.',
			status: 'planned',
			position: '1',
		});
	});
});

describe('milestoneFormToBody', () => {
	it('trims the text and sends the typed position', () => {
		expect(
			milestoneFormToBody({
				quarter: '  Q3 · 2026 ',
				title: ' Primer contrato auditado ',
				summary: ' Auditoría externa cerrada. ',
				status: 'now',
				position: '5',
			}),
		).toEqual({
			quarter: 'Q3 · 2026',
			title: 'Primer contrato auditado',
			summary: 'Auditoría externa cerrada.',
			status: 'now',
			position: 5,
		});
	});

	it('omits the position when the admin leaves it blank or unreadable', () => {
		const body = milestoneFormToBody({ ...EMPTY_MILESTONE_FORM, quarter: 'Q1', title: 'Hito', summary: 'S' });
		expect('position' in body).toBe(false);
		expect('position' in milestoneFormToBody({ ...EMPTY_MILESTONE_FORM, position: '2.5' })).toBe(false);
	});
});

describe('validateMilestoneForm', () => {
	it('answers null for a complete milestone', () => {
		expect(validateMilestoneForm(milestoneToForm(MILESTONE_ROW))).toBeNull();
	});

	it('asks for the quarter, the title, the summary and the position', () => {
		expect(validateMilestoneForm(EMPTY_MILESTONE_FORM)).toBe(
			'El hito necesita un trimestre (por ejemplo, «Q3 · 2026»).',
		);
		expect(validateMilestoneForm({ ...EMPTY_MILESTONE_FORM, quarter: 'Q3 · 2026' })).toBe(
			'El hito necesita un título.',
		);
		expect(validateMilestoneForm({ ...EMPTY_MILESTONE_FORM, quarter: 'Q3 · 2026', title: 'Hito' })).toBe(
			'El hito necesita un resumen.',
		);
		expect(
			validateMilestoneForm({
				...EMPTY_MILESTONE_FORM,
				quarter: 'Q3 · 2026',
				title: 'Hito',
				summary: 'Resumen',
				position: '3.5',
			}),
		).toBe('La posición tiene que ser un número entero igual o mayor que cero.');
	});
});
