export type Tool = {
	name: string;
	what: string;
	/**
	 * Origin of the recommendation, as `GET /tools` serves it. Optional so the
	 * offline fallback keeps its plain shape (it carries no classification).
	 */
	sponsorship?: ToolSponsorship;
};

/**
 * Origin of a tool recommendation in the "stack recomendado" block: a
 * `genuina` one is shown with nothing in exchange, a `patrocinada` one is part
 * of a paid agreement and the landing labels it as such. Optional so the
 * offline fallback keeps its plain shape (it carries no classification).
 */
export type ToolSponsorship = 'genuina' | 'patrocinada';
