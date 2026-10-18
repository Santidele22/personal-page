import { getJson } from '../../../shared/api/http';
import type { Subscriber, SubscriberCountByMonth } from '../types';

/**
 * Admin reads for the subscribers view. Both endpoints are admin-guarded on the
 * backend, so the request carries the Better Auth session cookie through the
 * shared `getJson` helper (`credentials: 'include'`).
 */
export function fetchSubscribers(): Promise<Subscriber[]> {
	return getJson<Subscriber[]>('/newsletter/subscribers');
}

export function fetchSubscriberCounts(): Promise<SubscriberCountByMonth[]> {
	return getJson<SubscriberCountByMonth[]>('/newsletter/subscribers/count-by-month');
}
