import type { AdvertisingPlan, AdvertisingPlanInput } from './api/advertising-admin';

/**
 * Pure form helpers for the advertising-plans admin panel: the editable shape,
 * the stored row ↔ form mappers, the public slot field catalogue and the
 * Spanish client-side validation. No DOM and no requests here.
 */

/** Form shape: everything is text so a half-typed price stays literal. */
export type AdvertisingPlanFormState = {
	price: string;
	description: string;
	slug: string;
	name: string;
	visibility: string;
	moment: string;
	format: string;
	cadence: string;
	note: string;
};

export const EMPTY_ADVERTISING_PLAN_FORM: AdvertisingPlanFormState = {
	price: '',
	description: '',
	slug: '',
	name: '',
	visibility: '',
	moment: '',
	format: '',
	cadence: '',
	note: '',
};

/** The public slot face of the plan, in landing order. */
export const PUBLIC_PLAN_FIELDS = [
	{ key: 'slug', label: 'SLUG', hint: 'Identidad del slot en la landing: pie, flujo, lectura, carta o patrono.' },
	{ key: 'name', label: 'NOMBRE', hint: 'Título que muestra el slot.' },
	{ key: 'visibility', label: 'VISIBILIDAD', hint: 'Cuánto se nota: discreto, medio, destacado.' },
	{ key: 'moment', label: 'MOMENTO', hint: 'Dónde aparece dentro de la página.' },
	{ key: 'format', label: 'FORMATO', hint: 'La forma del bloque: estático, sin animación.' },
	{ key: 'cadence', label: 'CADENCIA', hint: 'Lo que acompaña al precio: /mes, /trimestre.' },
	{ key: 'note', label: 'NOTA', hint: 'La línea editorial bajo el formato.' },
] as const;

export type PublicPlanFieldKey = (typeof PUBLIC_PLAN_FIELDS)[number]['key'];

/** `true` when the admin filled at least one public slot column. */
export function hasPublicFields(form: AdvertisingPlanFormState): boolean {
	return PUBLIC_PLAN_FIELDS.some((field) => form[field.key] !== '');
}

/** Maps a stored plan row into editable form fields. */
export function advertisingPlanToForm(plan: AdvertisingPlan): AdvertisingPlanFormState {
	return {
		price: plan.price.toString(),
		description: plan.description,
		slug: plan.slug ?? '',
		name: plan.name ?? '',
		visibility: plan.visibility ?? '',
		moment: plan.moment ?? '',
		format: plan.format ?? '',
		cadence: plan.cadence ?? '',
		note: plan.note ?? '',
	};
}

/** `''` → omitted: the backend rejects empty strings with `@IsNotEmpty`. */
function optional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

/** Accepts a Spanish decimal comma and surrounding blanks, like the price input. */
function normalizePrice(value: string): string {
	return value.trim().replace(',', '.');
}

const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
export function validateAdvertisingPlanForm(form: AdvertisingPlanFormState): string | null {
	if (!PRICE_PATTERN.test(normalizePrice(form.price))) {
		return 'El precio tiene que ser un número de hasta dos decimales y sin signo.';
	}

	if (!form.description.trim()) {
		return 'La descripción es obligatoria: es lo que explica el plan.';
	}

	return null;
}

/**
 * Form state → API body. Blank public columns are omitted so the backend keeps
 * the stored value instead of rejecting an empty string.
 */
export function advertisingPlanFormToBody(form: AdvertisingPlanFormState): AdvertisingPlanInput {
	return {
		price: Number(normalizePrice(form.price)),
		description: form.description.trim(),
		slug: optional(form.slug),
		name: optional(form.name),
		visibility: optional(form.visibility),
		moment: optional(form.moment),
		format: optional(form.format),
		cadence: optional(form.cadence),
		note: optional(form.note),
	};
}

/** The stored public columns of one plan, ready to render as a small list. */
export function publicPlanRows(plan: AdvertisingPlan): Array<{ label: string; value: string }> {
	return PUBLIC_PLAN_FIELDS.map((field) => ({ label: field.label, value: plan[field.key] ?? '' })).filter((row) =>
		Boolean(row.value),
	);
}
