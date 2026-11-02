/**
 * One certificate of the landing "certificados" section, as `GET /certificates`
 * serves it to an anonymous visitor: the editable columns only (`createdAt`
 * and `updatedAt` are admin bookkeeping the public read strips).
 */
export type Certificate = {
	id: number;
	/**
	 * Image an anonymous visitor can load: an absolute http(s) URL or a
	 * root-relative path the site serves. Absent when the certificate has no
	 * image, and also when the stored value is a path nothing serves — the
	 * card then renders without an image block instead of a broken
	 * placeholder (S6).
	 */
	image?: string;
	title: string;
	description: string;
	/**
	 * Link of the platform/institution that issued the certificate (the
	 * `issuerLink` column). `''` when the admin left it empty, which the
	 * DTO accepts so the link can be cleared.
	 */
	issuerLink: string;
	/**
	 * Issue date as stored (`YYYY-MM-DD`). The public read already orders by
	 * this column DESC (S3), so the widget renders the API order as it comes.
	 */
	date: string;
};
