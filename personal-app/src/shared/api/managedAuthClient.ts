import type { VanillaBetterAuthClient } from '@neondatabase/auth';

let clientRequest: Promise<VanillaBetterAuthClient> | undefined;

async function createManagedAuthClient(): Promise<VanillaBetterAuthClient> {
	const [{ createAuthClient }, { BetterAuthVanillaAdapter }] = await Promise.all([
		import('@neondatabase/auth'),
		import('@neondatabase/auth/vanilla/adapters'),
	]);

	return createAuthClient(`${window.location.origin}/api/auth`, {
		adapter: BetterAuthVanillaAdapter({
			fetchOptions: { credentials: 'include' },
		}),
	});
}

export function getManagedAuthClient(): Promise<VanillaBetterAuthClient> {
	if (typeof window === 'undefined') {
		throw new Error('El cliente de Neon Auth solo está disponible en el navegador.');
	}

	clientRequest ??= createManagedAuthClient();
	return clientRequest;
}

export async function getManagedAuthToken(): Promise<string> {
	const { data, error } = await (await getManagedAuthClient()).token();
	if (error || !data?.token) {
		throw new Error('No se pudo obtener la credencial de la sesión.');
	}

	return data.token;
}
