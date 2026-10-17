import { formatCount, formatDay, formatDayMonth, formatDayMonthYear, formatEuro, formatLevel } from './format';
import type {
	AdminKpi,
	AdminPost,
	AdminRenewal,
	AdminSlot,
	AdminSlotOccupancy,
	AdminSlotStatusLine,
	AdminSummaryStat,
	ApiAdvertisingPlan,
	ApiBlog,
	ApiBrand,
	ApiProject,
	ApiService,
} from './types';

/**
 * Turns the API DTOs into the props the existing admin widgets already render.
 * Only fields the backend exposes are used: a slot has no size, position or
 * impressions in the API, so those props stay undefined and the widgets show a
 * neutral «—». An advertising plan is the panel's slot: `description` is its
 * label and `price` its price. A brand is active while `activeUntil` is empty
 * or in the future.
 */

/** A renewal within this window is flagged on the renewals card. */
const RENEWAL_WARNING_MS = 30 * 24 * 60 * 60 * 1000;

/** Renewal policy copy of the renewals card. Panel copy, not API data. */
export const RENEWALS_NOTE =
	'La renovación se propone 15 días antes del vencimiento. Nunca se reasigna un slot sin confirmación de la marca.';

export function isBrandActive(brand: ApiBrand, now: Date): boolean {
	if (!brand.activeUntil) return true;

	return new Date(brand.activeUntil).getTime() >= now.getTime();
}

/* ---------- Diario ---------- */

export function toDiarioPosts(blogs: ApiBlog[]): AdminPost[] {
	return blogs.map((blog) => ({
		id: String(blog.id),
		title: blog.title,
		category: formatLevel(blog.level),
		// The backend has no draft state: every stored blog is a published entry.
		status: 'publicado',
		// Neither views nor comments exist in the API: the table shows «—».
		views: null,
		comments: null,
		date: formatDay(blog.createdAt),
	}));
}

export function toDiarioStats(blogs: ApiBlog[]): AdminSummaryStat[] {
	const authors = new Set(blogs.map((blog) => blog.authorId)).size;

	return [
		{ value: formatCount(blogs.length), label: 'entradas publicadas', dot: 'neutral' },
		// No draft state exists in the API, so there is never an open draft.
		{ value: '0', label: 'borradores abiertos', dot: 'hollow' },
		{ value: formatCount(authors), label: 'autores', dot: 'aka' },
	];
}

/* ---------- Publicidad ---------- */

export function toPublicidadKpis(plans: ApiAdvertisingPlan[], brands: ApiBrand[], now: Date): AdminKpi[] {
	const occupied = occupiedPlans(plans, brands, now);
	const revenue = occupied.reduce((sum, plan) => sum + plan.price, 0);
	const next = upcomingDue(brands, now);

	return [
		{ id: 'ingresos', label: 'Ingresos activos', value: formatEuro(revenue) },
		{ id: 'ocupacion', label: 'Ocupación', value: String(occupied.length), unit: `de ${plans.length} planes` },
		{ id: 'renovacion', label: 'Próxima renovación', value: next ? formatDayMonth(next) : '—' },
	];
}

export function toPublicidadSlots(plans: ApiAdvertisingPlan[], brands: ApiBrand[], now: Date): AdminSlot[] {
	const byPlan = groupByPlan(brands);

	return plans.map((plan) => {
		const planBrands = byPlan.get(plan.id) ?? [];
		const occupied = planBrands.some((brand) => isBrandActive(brand, now));
		const due = upcomingDue(planBrands, now);

		return {
			id: String(plan.id),
			name: plan.description,
			status: occupied ? 'reservado' : 'disponible',
			brand: occupied ? planBrands.map((brand) => brand.name).join(', ') : undefined,
			period: due ? `hasta ${formatDayMonthYear(due)}` : undefined,
			price: formatEuro(plan.price),
			isImminent: due ? new Date(due).getTime() - now.getTime() <= RENEWAL_WARNING_MS : undefined,
		};
	});
}

/* ---------- Resumen ---------- */

export function toResumenKpis(
	blogs: ApiBlog[],
	projects: ApiProject[],
	services: ApiService[],
	brands: ApiBrand[],
	now: Date,
): AdminKpi[] {
	const activeBrands = brands.filter((brand) => isBrandActive(brand, now)).length;
	const withRepository = projects.filter((project) => Boolean(project.githubUrl)).length;
	const cheapest = services.length > 0 ? Math.min(...services.map((service) => service.price)) : null;
	const lastEntry = latestDate(blogs.map((blog) => blog.createdAt));

	return [
		{
			id: 'entradas',
			label: 'Entradas del diario',
			value: formatCount(blogs.length),
			note: lastEntry ? `última: ${formatDay(lastEntry)}` : 'sin entradas',
		},
		{ id: 'proyectos', label: 'Proyectos', value: formatCount(projects.length), note: `${formatCount(withRepository)} con repositorio` },
		{ id: 'servicios', label: 'Servicios', value: formatCount(services.length), note: cheapest === null ? 'sin servicios' : `desde ${formatEuro(cheapest)}` },
		{ id: 'marcas', label: 'Marcas activas', value: formatCount(activeBrands), note: `${formatCount(brands.length)} en total` },
	];
}

export function toOccupancy(plans: ApiAdvertisingPlan[], brands: ApiBrand[], now: Date): AdminSlotOccupancy {
	const occupied = occupiedPlans(plans, brands, now);
	const revenue = occupied.reduce((sum, plan) => sum + plan.price, 0);
	const potential = plans.reduce((sum, plan) => sum + plan.price, 0);

	return {
		percent: plans.length > 0 ? Math.round((occupied.length / plans.length) * 100) : 0,
		value: formatEuro(revenue),
		max: formatEuro(potential),
		note: plans.length > 0 ? `${occupied.length} de ${plans.length} planes ocupados.` : 'Sin planes de publicidad todavía.',
		href: '/admin/publicidad',
		linkLabel: 'Gestionar publicidad',
	};
}

export function toSlotStatusLines(plans: ApiAdvertisingPlan[], brands: ApiBrand[], now: Date): AdminSlotStatusLine[] {
	const byPlan = groupByPlan(brands);

	return plans.map((plan) => ({
		id: String(plan.id),
		name: plan.description,
		price: formatEuro(plan.price),
		active: (byPlan.get(plan.id) ?? []).some((brand) => isBrandActive(brand, now)),
	}));
}

export function toRenewals(
	plans: ApiAdvertisingPlan[],
	brands: ApiBrand[],
	now: Date,
	limit = 5,
): { renewals: AdminRenewal[]; nextRenewal: string } {
	const planById = new Map(plans.map((plan) => [plan.id, plan]));
	const due: { brand: ApiBrand; until: string }[] = [];

	for (const brand of brands) {
		const until = brand.activeUntil;

		if (until && new Date(until).getTime() >= now.getTime()) {
			due.push({ brand, until });
		}
	}

	due.sort((a, b) => new Date(a.until).getTime() - new Date(b.until).getTime());

	const renewals = due.slice(0, limit).map(({ brand, until }) => {
		const plan = planById.get(brand.planId);
		const warning = new Date(until).getTime() - now.getTime() <= RENEWAL_WARNING_MS ? 'Vence pronto — enviar recordatorio' : undefined;

		return {
			id: String(brand.id),
			slotName: plan ? plan.description : `Plan ${brand.planId}`,
			brand: brand.name,
			dateLabel: formatDayMonth(until),
			price: plan ? formatEuro(plan.price) : '—',
			warning,
		};
	});

	return {
		renewals,
		nextRenewal: due[0] ? formatDayMonthYear(due[0].until) : '—',
	};
}

/* ---------- Helpers ---------- */

function groupByPlan(brands: ApiBrand[]): Map<number, ApiBrand[]> {
	const grouped = new Map<number, ApiBrand[]>();

	for (const brand of brands) {
		const list = grouped.get(brand.planId);

		if (list) list.push(brand);
		else grouped.set(brand.planId, [brand]);
	}

	return grouped;
}

/** A plan is occupied when at least one of its brands is active. */
function occupiedPlans(plans: ApiAdvertisingPlan[], brands: ApiBrand[], now: Date): ApiAdvertisingPlan[] {
	const byPlan = groupByPlan(brands);

	return plans.filter((plan) => (byPlan.get(plan.id) ?? []).some((brand) => isBrandActive(brand, now)));
}

/** Earliest `activeUntil` still in the future, or `null`. */
function upcomingDue(brands: ApiBrand[], now: Date): string | null {
	const dates = brands
		.map((brand) => brand.activeUntil)
		.filter((until): until is string => until !== null)
		.filter((until) => new Date(until).getTime() >= now.getTime())
		.sort();

	return dates[0] ?? null;
}

/** Most recent ISO timestamp of the list, or `null` when the list is empty. */
function latestDate(isoDates: string[]): string | null {
	let latest: string | null = null;

	for (const iso of isoDates) {
		if (latest === null || iso > latest) latest = iso;
	}

	return latest;
}
