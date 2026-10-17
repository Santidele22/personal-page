import { postJson } from '../../../shared/api/http';

export function subscribeNewsletter(email: string): Promise<void> {
	return postJson('/newsletter/subscribe', { email });
}
