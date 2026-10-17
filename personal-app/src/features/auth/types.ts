/**
 * Shape of the session Better Auth returns from `get-session`. Only the fields
 * the panel renders are declared: `role` comes from the `admin` plugin and the
 * profile fields from `user.additionalFields` in the backend config.
 */
export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role?: string;
	firstName?: string | null;
	lastName?: string | null;
};

export type AuthSession = {
	session: {
		id: string;
		expiresAt: Date | string;
	};
	user: AuthUser;
};

export type AuthSessionStatus = 'loading' | 'authenticated' | 'anonymous';
