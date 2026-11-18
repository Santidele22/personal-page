import { isBrandActive } from '../../entities/admin/adapter';
import { formatDayMonthYear } from '../../entities/admin/format';
import type { ApiBrand } from '../../entities/admin/types';
import type { AdvertisingPlan } from './api/advertising-admin';
import type { BrandInput } from './api/brands-admin';

/**
 * Pure form helpers for the brands admin panel: the editable shape, the stored
 * row ↔ form mappers, the row copy the list renders and the Spanish
 * client-side validation. No DOM and no requests here.
 */

/** Form shape: everything is text, including the plan id and the date input. */
export type BrandFormState = {
	name: string;
	imageUrl: string;
	url: string;
	planId: string;
	activeUntil: string;
};

export const EMPTY_BRAND_FORM: BrandFormState = {
	name: '',
	imageUrl: '',
	url: '',
	planId: '',
	activeUntil: '',
};

/** Maps a stored brand row into editable form fields. */
export function brandToForm(brand: ApiBrand): BrandFormState {
	return {
		name: brand.name,
		imageUrl: brand.imageUrl,
		url: brand.url ?? '',
		planId: String(brand.planId),
		// The date input wants `YYYY-MM-DD`; the API sends an ISO timestamp.
		activeUntil: brand.activeUntil ? brand.activeUntil.slice(0, 10) : '',
	};
}

/** `''` → omitted: the backend rejects empty strings. */
function optional(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

/** Client-side check so the admin gets Spanish copy instead of a raw `400`. */
export function validateBrandForm(form: BrandFormState): string | null {
	if (!form.name.trim()) {
		return 'La marca necesita un nombre.';
	}

	if (!form.imageUrl.trim()) {
		return 'La marca necesita un logo: la URL de la imagen.';
	}

	// The DTO validates `planId` as an integer; the select carries it as text.
	if (!form.planId || !Number.isInteger(Number(form.planId))) {
		return 'Elige el plan que ocupa la marca.';
	}

	const activeUntil = optional(form.activeUntil);

	if (activeUntil && Number.isNaN(new Date(activeUntil).getTime())) {
		return 'La vigencia tiene que ser una fecha válida.';
	}

	return null;
}

/**
 * Form state → API body. Blank optional fields are omitted so the backend keeps
 * the stored value instead of rejecting an empty string.
 */
export function brandFormToBody(form: BrandFormState): BrandInput {
	return {
		name: form.name.trim(),
		imageUrl: form.imageUrl.trim(),
		url: optional(form.url),
		planId: Number(form.planId),
		activeUntil: optional(form.activeUntil),
	};
}

/** Description of the plan a brand occupies, with the raw id as fallback. */
export function planLabel(plans: readonly AdvertisingPlan[], planId: number): string {
	return plans.find((plan) => plan.id === planId)?.description ?? `Plan #${planId}`;
}

/** Row copy for the validity column, reusing the adapter's active rule. */
export function validityOf(brand: ApiBrand, now: Date): { text: string; active: boolean } {
	if (!brand.activeUntil) {
		return { text: 'Sin vencimiento', active: true };
	}

	const day = formatDayMonthYear(brand.activeUntil);

	return isBrandActive(brand, now)
		? { text: `Hasta el ${day}`, active: true }
		: { text: `Vencida el ${day}`, active: false };
}
