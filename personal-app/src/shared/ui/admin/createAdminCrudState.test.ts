import { describe, expect, it, vi } from 'vitest';

import { createAdminCrudState } from './createAdminCrudState';

describe('createAdminCrudState', () => {
	it('starts in loading state with empty rows and idle feedback', () => {
		const crud = createAdminCrudState({
			fetchRows: async () => [],
		});

		expect(crud.status()).toBe('loading');
		expect(crud.rows()).toEqual([]);
		expect(crud.pending()).toBe(false);
		expect(crud.feedback()).toEqual({ kind: 'idle' });
	});

	it('loads rows and enters ready state on success', async () => {
		const crud = createAdminCrudState({
			fetchRows: async () => [{ id: 1, name: 'Uno' }],
		});

		const ok = await crud.load();

		expect(ok).toBe(true);
		expect(crud.status()).toBe('ready');
		expect(crud.rows()).toEqual([{ id: 1, name: 'Uno' }]);
	});

	it('sets error status when an explicit load fails', async () => {
		const crud = createAdminCrudState({
			fetchRows: async () => {
				throw new Error('Unauthorized');
			},
		});

		const ok = await crud.load();

		expect(ok).toBe(false);
		expect(crud.status()).toBe('error');
	});

	it('runs a mutation, reloads rows, and shows success feedback', async () => {
		const fetchRows = vi
			.fn<() => Promise<{ id: number }[]>>()
			.mockResolvedValueOnce([{ id: 1 }])
			.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
		const action = vi.fn(async () => {});

		const crud = createAdminCrudState({ fetchRows });
		await crud.load();

		const saved = await crud.mutate(action, 'Elemento añadido.');

		expect(saved).toBe(true);
		expect(action).toHaveBeenCalledTimes(1);
		expect(crud.status()).toBe('ready');
		expect(crud.rows()).toEqual([{ id: 1 }, { id: 2 }]);
		expect(crud.pending()).toBe(false);
		expect(crud.feedback()).toEqual({ kind: 'success', message: 'Elemento añadido.' });
	});

	it('surfaces formatted API error without reloading when mutation fails', async () => {
		const fetchRows = vi.fn(async () => [{ id: 1 }]);
		const crud = createAdminCrudState({ fetchRows });
		await crud.load();

		const saved = await crud.mutate(async () => {
			throw new Error('Validation failed');
		}, 'Guardado.');

		expect(saved).toBe(false);
		expect(fetchRows).toHaveBeenCalledTimes(1);
		expect(crud.pending()).toBe(false);
		expect(crud.feedback()).toEqual({
			kind: 'error',
			message: 'No pudimos guardar los cambios. (Validation failed)',
		});
	});

	it('keeps ready status and warns when silent reload fails after a successful mutation', async () => {
		const fetchRows = vi
			.fn<() => Promise<{ id: number }[]>>()
			.mockResolvedValueOnce([{ id: 1 }])
			.mockRejectedValueOnce(new Error('Network down'));

		const crud = createAdminCrudState({ fetchRows });
		await crud.load();

		const saved = await crud.mutate(async () => {}, 'Cambios guardados.');

		expect(saved).toBe(true);
		expect(crud.status()).toBe('ready');
		expect(crud.rows()).toEqual([{ id: 1 }]);
		expect(crud.pending()).toBe(false);
		expect(crud.feedback()).toEqual({
			kind: 'error',
			message: 'Cambios guardados. No pudimos actualizar la lista; recargá la página para ver el estado actual.',
		});
	});

	it('ignores concurrent mutations while a request is already pending', async () => {
		let resolveFirst!: () => void;
		const firstPromise = new Promise<void>((resolve) => {
			resolveFirst = resolve;
		});
		const secondAction = vi.fn(async () => {});

		const crud = createAdminCrudState({ fetchRows: async () => [] });
		await crud.load();

		const firstRun = crud.mutate(() => firstPromise, 'Primero.');
		expect(crud.pending()).toBe(true);

		const secondRun = await crud.mutate(secondAction, 'Segundo.');
		expect(secondRun).toBe(false);
		expect(secondAction).not.toHaveBeenCalled();

		resolveFirst();
		await firstRun;
		expect(crud.pending()).toBe(false);
	});
});
