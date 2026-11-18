import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createService,
	deleteService,
	fetchAdminServices,
	updateService,
} from './api/services-admin';
import type { AdminServiceRow } from './api/services-admin';
import {
	EMPTY_SERVICE_FORM,
	serviceFormToBody,
	serviceToForm,
	validateServiceForm,
} from './serviceForm';
import type { ServiceFormState } from './serviceForm';
import type { ServiceNotice } from './components/ServiceFields';
import { ServicesEditorView } from './components/ServicesEditorView';

/**
 * Admin CRUD container for the services cards. The list is the stored collection
 * as `GET /services` serves it; the panel adds one card at a time (`POST`), edits
 * a stored row in place (`PATCH`) and removes it after a second click
 * (`DELETE`). Every mutation refetches, so the list never drifts from storage.
 * The session gate lives in the admin shell (`AdminTopBar` mounts
 * `SessionGuard`), like the other panels. Like the profile editor, the
 * list-shaped `features` column stays as textarea text, one item per line.
 * `createAdminCrudState` owns the fetch state and the mutation lock; the view is
 * purely presentational.
 */

/** The message of the shared helper, which maps `{ message }` from the API. */
function messageFrom(cause: unknown): string | undefined {
	return cause instanceof Error && cause.message ? cause.message : undefined;
}

export default function ServicesEditorPanel() {
	const crud = createAdminCrudState<AdminServiceRow>({
		fetchRows: fetchAdminServices,
	});

	const [notice, setNotice] = createSignal<ServiceNotice | null>(null);

	const [newForm, setNewForm] = createSignal<ServiceFormState>(EMPTY_SERVICE_FORM);
	const [creating, setCreating] = createSignal(false);

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [draftForm, setDraftForm] = createSignal<ServiceFormState>(EMPTY_SERVICE_FORM);
	const [savingEdit, setSavingEdit] = createSignal(false);

	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [deletingId, setDeletingId] = createSignal<number | null>(null);

	onMount(() => {
		void crud.load();
	});

	/** The notice of one scope, so a list message never lands inside a form. */
	function noticeFor(scope: ServiceNotice['scope']): ServiceNotice | null {
		const current = notice();
		return current && current.scope === scope ? current : null;
	}

	function updateNew<K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
	}

	function updateDraft<K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));
	}

	/**
	 * Runs one mutation through the shared CRUD state and answers it in the
	 * panel's own notice line: Spanish copy plus the API detail, the way this
	 * panel always did. The cause is captured because the shared state folds it
	 * into one formatted string.
	 */
	async function mutate(
		scope: ServiceNotice['scope'],
		action: () => Promise<void>,
		successMessage: string,
		failureMessage: string,
	): Promise<boolean> {
		if (crud.pending()) return false;

		setNotice(null);

		let cause: unknown;
		const saved = await crud.mutate(async () => {
			try {
				await action();
			} catch (error) {
				cause = error;
				throw error;
			}
		}, successMessage);

		if (saved) {
			setNotice({ scope, kind: 'saved', message: successMessage });
			return true;
		}

		// This panel answers a failed mutation with its own copy, not the shared banner.
		crud.clearFeedback();
		setNotice({ scope, kind: 'error', message: failureMessage, detail: messageFrom(cause) });
		return false;
	}

	/** Validates in Spanish, then runs the mutation only when the form passes. */
	async function submitValidated(
		scope: ServiceNotice['scope'],
		form: ServiceFormState,
		action: () => Promise<void>,
		successMessage: string,
		failureMessage: string,
	): Promise<boolean> {
		const complaint = validateServiceForm(form);

		if (complaint) {
			setNotice({ scope, kind: 'error', message: complaint });
			return false;
		}

		return mutate(scope, action, successMessage, failureMessage);
	}

	function startEdit(row: AdminServiceRow) {
		setEditingId(row.id);
		setDraftForm(serviceToForm(row));
		setConfirmingDeleteId(null);
		setNotice(null);
	}

	function cancelEdit() {
		setEditingId(null);
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();

		if (creating()) return;

		setCreating(true);

		try {
			const current = newForm();
			const created = await submitValidated(
				'create',
				current,
				() => createService(serviceFormToBody(current)),
				'Servicio agregado. La web ya lo muestra.',
				'No pudimos guardar el servicio. Inténtalo de nuevo en unos minutos.',
			);

			if (created) setNewForm(EMPTY_SERVICE_FORM);
		} finally {
			setCreating(false);
		}
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();

		if (savingEdit()) return;

		setSavingEdit(true);

		try {
			const current = draftForm();
			await submitValidated(
				'edit',
				current,
				() => updateService(id, serviceFormToBody(current)),
				'Cambios guardados. La web ya los muestra.',
				'No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.',
			);
		} finally {
			setSavingEdit(false);
		}
	}

	async function handleDelete(id: number) {
		if (deletingId() !== null) return;

		setDeletingId(id);

		try {
			const removed = await mutate(
				'delete',
				() => deleteService(id),
				'Servicio eliminado. La web ya no lo muestra.',
				'No pudimos eliminar el servicio. Inténtalo de nuevo en unos minutos.',
			);

			if (!removed) return;

			setConfirmingDeleteId(null);
			if (editingId() === id) setEditingId(null);
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<ServicesEditorView
			status={crud.status()}
			services={crud.rows()}
			creating={creating()}
			editingId={editingId()}
			confirmingDeleteId={confirmingDeleteId()}
			deletingId={deletingId()}
			savingEdit={savingEdit()}
			newForm={newForm()}
			draftForm={draftForm()}
			createNotice={noticeFor('create')}
			editNotice={noticeFor('edit')}
			deleteNotice={noticeFor('delete')}
			onRetry={() => void crud.load()}
			onCreateSubmit={(event) => void handleCreate(event)}
			onNewInput={updateNew}
			onDraftInput={updateDraft}
			onStartEdit={startEdit}
			onCancelEdit={cancelEdit}
			onSubmitEdit={(event, id) => void handleEdit(event, id)}
			onRequestDelete={(id: number) => setConfirmingDeleteId(id)}
			onConfirmDelete={(id: number) => void handleDelete(id)}
			onCancelDelete={() => setConfirmingDeleteId(null)}
		/>
	);
}
