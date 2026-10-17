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
	dimensions: string;
	price: string;
	/** Slot reservado este mes. */
	active: boolean;
};

export type AdminSlotStatus = 'reservado' | 'disponible';

export type AdminSlot = {
	id: string;
	name: string;
	dimensions: string;
	position: string;
	status: AdminSlotStatus;
	/** Solo cuando el slot está reservado. */
	brand?: string;
	/** Rango de fechas del contrato, ya formateado. */
	period?: string;
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
	/** `null` cuando es un borrador que aún no registra visitas. */
	views: string | null;
	comments: number;
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
