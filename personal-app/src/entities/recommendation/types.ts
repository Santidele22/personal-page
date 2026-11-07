/**
 * One LinkedIn recommendation of the home bento, as `GET /recommendations`
 * serves it to an anonymous visitor: the editable columns only (`createdAt`
 * and `updatedAt` are admin bookkeeping the public read strips).
 */
export type Recommendation = {
	id: number;
	/** The quote text, rendered as a mincho blockquote. */
	quote: string;
	authorName: string;
	/** Role line under the name, e.g. «CTO · Blockchain & AI Engineer». */
	authorRole: string;
	/** Relation chip, e.g. «Me supervisó directamente»; `''` hides the chip. */
	relationship: string;
	/**
	 * Link to the recommendation on LinkedIn. `''` when the admin left it
	 * empty (the DTO accepts it), and the card renders no «in ↗» link.
	 */
	linkedinUrl: string;
};
