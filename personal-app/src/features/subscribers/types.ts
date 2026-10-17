/**
 * Shape returned by `GET /newsletter/subscribers` (backend
 * `src/newsletter/entities/subscriber.entity.ts`). Types live here, with the
 * feature, so the subscribers view does not depend on `entities/admin`.
 */
export type Subscriber = {
	id: string;
	email: string;
	name: string | null;
	origin: string | null;
	source: string | null;
	/** ISO timestamp. */
	createdAt: string;
};

/** Shape returned by `GET /newsletter/subscribers/count-by-month`. */
export type SubscriberCountByMonth = {
	/** Calendar month in `YYYY-MM` form. */
	month: string;
	count: number;
};

export type SubscribersStatus = 'loading' | 'ready' | 'error';
