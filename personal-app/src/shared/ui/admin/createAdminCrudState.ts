import { createSignal } from 'solid-js';
import { formatAdminError } from '../../lib/adminPanel';
import type { AdminPanelFeedback, AdminPanelStatus } from '../../lib/adminPanel';

export type AdminCrudStateOptions<TRow> = {
	fetchRows: () => Promise<TRow[]>;
	saveErrorFallback?: string;
};

const DEFAULT_SAVE_ERROR = 'No pudimos guardar los cambios.';

/**
 * Shared SolidJS state controller for list-backed admin CRUD panels.
 * Keeps loading, error, pending lock, and feedback transitions consistent,
 * and ensures a transient refetch failure after a successful mutation does not
 * replace the ready editor with a full-screen error state.
 */
export function createAdminCrudState<TRow>(options: AdminCrudStateOptions<TRow>) {
	const [status, setStatus] = createSignal<AdminPanelStatus>('loading');
	const [rows, setRows] = createSignal<TRow[]>([]);
	const [pending, setPending] = createSignal(false);
	const [feedback, setFeedback] = createSignal<AdminPanelFeedback>({ kind: 'idle' });

	const saveErrorFallback = options.saveErrorFallback ?? DEFAULT_SAVE_ERROR;

	function clearFeedback() {
		setFeedback({ kind: 'idle' });
	}

	async function load(loadOptions: { silent?: boolean } = {}): Promise<boolean> {
		if (!loadOptions.silent) setStatus('loading');

		try {
			setRows(await options.fetchRows());
			setStatus('ready');
			return true;
		} catch {
			if (!loadOptions.silent) setStatus('error');
			return false;
		}
	}

	async function mutate(action: () => Promise<void>, successMessage: string): Promise<boolean> {
		if (pending()) return false;

		setPending(true);
		clearFeedback();

		try {
			await action();
		} catch (cause) {
			setFeedback({ kind: 'error', message: formatAdminError(saveErrorFallback, cause) });
			setPending(false);
			return false;
		}

		const reloaded = await load({ silent: true });
		if (reloaded) {
			setFeedback({ kind: 'success', message: successMessage });
		} else {
			setFeedback({
				kind: 'error',
				message: `${successMessage} No pudimos actualizar la lista; recargá la página para ver el estado actual.`,
			});
		}

		setPending(false);
		return true;
	}

	return {
		status,
		rows,
		pending,
		feedback,
		setFeedback,
		clearFeedback,
		load,
		mutate,
	};
}
