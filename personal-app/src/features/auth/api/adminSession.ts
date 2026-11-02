import type { AuthSession } from '../types';

export function isAdminSession(value: unknown): value is AuthSession {
	if (typeof value !== 'object' || value === null || !('user' in value)) {
		return false;
	}

	const user = (value as { user?: unknown }).user;

	return typeof user === 'object' && user !== null && 'role' in user && user.role === 'admin';
}
