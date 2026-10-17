export type AdminSection = 'resumen' | 'diario' | 'publicidad' | 'suscriptores';

export type AdminKpi = {
	id: string;
	label: string;
	value: string;
	unit?: string;
	trend?: string;
	note?: string;
};

export type AdminSlotOccupancy = {
	/** Porcentaje de ocupación para el anillo del donut. */
	percent: number;
	/** Facturación actual de los slots. */
	value: string;
	/** Facturación potencial al 100 %. */
	max: string;
	note: string;
	href: string;
	linkLabel: string;
};

export type AdminSlotStatusLine = {
	id: string;
	name: string;
	/** Tamaño del slot; el backend no lo expone, la vista muestra «—». */
	dimensions?: string;
	price: string;
	/** Slot con una marca activa. */
	active: boolean;
};

export type AdminSlotStatus = 'reservado' | 'disponible';

export type AdminSlot = {
	id: string;
	name: string;
	/** Tamaño del slot; el backend no lo expone, la vista muestra «—». */
	dimensions?: string;
	/** Ubicación del slot; el backend no la expone, la vista muestra «—». */
	position?: string;
	status: AdminSlotStatus;
	/** Solo cuando el slot está reservado. */
	brand?: string;
	/** Fecha de fin del contrato, ya formateada. */
	period?: string;
	/** Impresiones del slot; el backend no las expone, la vista muestra «—». */
	impressions?: string;
	price: string;
	/** Renovación próxima: se marca con color de aviso. */
	isImminent?: boolean;
};

export type AdminRenewal = {
	id: string;
	slotName: string;
	brand: string;
	/** Etiqueta corta del mes de vencimiento, p. ej. «30 nov». */
	dateLabel: string;
	price: string;
	warning?: string;
};

export type AdminPostStatus = 'publicado' | 'borrador';

export type AdminPost = {
	id: string;
	title: string;
	category: string;
	status: AdminPostStatus;
	/** `null` cuando el backend no registra visitas de la entrada. */
	views: string | null;
	/** `null` cuando el backend no registra comentarios de la entrada. */
	comments: number | null;
	/** Fecha ya formateada, p. ej. «2026.10.12». */
	date: string;
};

export type AdminSubscriberStatus = 'activo' | 'pendiente';

export type AdminSummaryStatDot = 'neutral' | 'hollow' | 'aka';

export type AdminSummaryStat = {
	value: string;
	label: string;
	/** Color del punto decorativo junto al valor. */
	dot: AdminSummaryStatDot;
};

export type AdminSubscriber = {
	id: string;
	email: string;
	name: string;
	origin: string;
	/** Fecha ya formateada, p. ej. «2026.10.15». */
	date: string;
	status: AdminSubscriberStatus;
};

export type AdminSignupByMonth = {
	month: string;
	value: number;
};

/* ---------- Contrato de la API (DTO tal cual los devuelve el backend) ---------- */

/**
 * Shapes returned by the backend read endpoints. They mirror the TypeORM
 * entities field by field (`backend/src/<module>/entities/*.entity.ts`) and the
 * `findAll()` queries, which load no relations: `advertising-plans` arrives
 * without `brands[]`, and `brands` without the nested `plan` object (only
 * `planId` links them).
 */

export type ApiBlogLevel = 'basico' | 'intermedio' | 'avanzado';

export type ApiBlog = {
	id: number;
	title: string;
	description: string;
	content: string;
	level: ApiBlogLevel;
	createdAt: string;
	authorId: string;
};

export type ApiAdvertisingPlan = {
	id: number;
	price: number;
	description: string;
};

export type ApiBrand = {
	id: number;
	name: string;
	imageUrl: string;
	activeUntil: string | null;
	createdAt: string;
	planId: number;
};

export type ApiProject = {
	id: number;
	url: string;
	name: string;
	description: string;
	githubUrl?: string | null;
	technologies: string[];
	ownerId: string;
};

export type ApiService = {
	id: number;
	name: string;
	description: string;
	features: string[];
	price: number;
	userId: string;
};

/* ---------- Vistas compuestas que consumen las páginas ---------- */

export type AdminResumenView = {
	kpis: AdminKpi[];
	occupancy: AdminSlotOccupancy;
	slotLines: AdminSlotStatusLine[];
	renewals: AdminRenewal[];
	nextRenewal: string;
};

export type AdminPublicidadView = {
	kpis: AdminKpi[];
	slots: AdminSlot[];
};

export type AdminDiarioView = {
	stats: AdminSummaryStat[];
	posts: AdminPost[];
};
