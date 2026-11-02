import type { VanillaBetterAuthClient } from '@neondatabase/auth';

type ManagedAuth = {
	adapter: VanillaBetterAuthClient;
	getJWTToken: () => Promise<string | null>;
};

let authRequest: Promise<ManagedAuth> | undefined;

async function createManagedAuth(): Promise<ManagedAuth> {
	const [{ createInternalNeonAuth }, { BetterAuthVanillaAdapter }] = await Promise.all([
		import('@neondatabase/auth'),
		import('@neondatabase/auth/vanilla/adapters'),
	]);

	return createInternalNeonAuth<ReturnType<ReturnType<typeof BetterAuthVanillaAdapter>>>(`${window.location.origin}/api/auth`, {
		adapter: BetterAuthVanillaAdapter({
			fetchOptions: { credentials: 'include' },
		}),
	});
}

function getManagedAuth(): Promise<ManagedAuth> {
	if (typeof window === 'undefined') {
		throw new Error('El cliente de Neon Auth solo está disponible en el navegador.');
	}

	authRequest ??= createManagedAuth();
	return authRequest;
}

export async function getManagedAuthClient(): Promise<VanillaBetterAuthClient> {
	return (await getManagedAuth()).adapter;
}

export async function getManagedAuthToken(): Promise<string> {
	const token = await (await getManagedAuth()).getJWTToken();
	if (!token) {
		throw new Error('La sesión anterior ya no es válida. Cerrá sesión e ingresá con las credenciales nuevas.');
	}

	return token;
}
