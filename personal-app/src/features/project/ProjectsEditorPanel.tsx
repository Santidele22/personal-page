import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createProject,
	deleteProject,
	fetchAdminProjects,
	updateProject,
} from './api/projects-admin';
import type { AdminProjectRow } from './api/projects-admin';
import {
	EMPTY_PROJECT_FORM,
	projectFormToBody,
	projectToForm,
	validateProjectForm,
} from './projectForm';
import type { ProjectFormState } from './projectForm';
import type { ProjectNotice } from './components/ProjectFields';
import { ProjectsEditorView } from './components/ProjectsEditorView';

/**
 * Admin CRUD container for the projects cards. The list is the stored
 * collection as `GET /projects` serves it; the panel adds one card at a time
 * (`POST`), edits a stored row in place (`PATCH`) and removes it after a second
 * click (`DELETE`). Every mutation refetches, so the list never drifts from
 * storage. The session gate lives in the admin shell (`AdminTopBar` mounts
 * `SessionGuard`), like the other panels. The list-shaped `technologies` column
 * is a toggle list: the catalog chips switch one id each, and values stored
 * outside the catalog keep their own dashed toggle so a save never drops them.
 * `createAdminCrudState` owns the fetch state and the mutation lock; the view is
 * purely presentational. A raw fetch message (for example `Unauthorized`) never
 * reaches the admin: the view answers in Spanish and offers a retry, like the
 * subscribers view.
 */

/** The message of the shared helper, which maps `{ message }` from the API. */
function messageFrom(cause: unknown): string | undefined {
	return cause instanceof Error && cause.message ? cause.message : undefined;
}

export default function ProjectsEditorPanel() {
	const crud = createAdminCrudState<AdminProjectRow>({
		fetchRows: fetchAdminProjects,
	});

	const [notice, setNotice] = createSignal<ProjectNotice | null>(null);

	const [newForm, setNewForm] = createSignal<ProjectFormState>(EMPTY_PROJECT_FORM);
	const [creating, setCreating] = createSignal(false);

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [draftForm, setDraftForm] = createSignal<ProjectFormState>(EMPTY_PROJECT_FORM);
	const [savingEdit, setSavingEdit] = createSignal(false);

	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [deletingId, setDeletingId] = createSignal<number | null>(null);

	onMount(() => {
		void crud.load();
	});

	/** The notice of one scope, so a list message never lands inside a form. */
	function noticeFor(scope: ProjectNotice['scope']): ProjectNotice | null {
		const current = notice();
		return current && current.scope === scope ? current : null;
	}

	function updateNew<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
	}

	function updateDraft<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));
	}

	/**
	 * Runs one mutation through the shared CRUD state and answers it in the
	 * panel's own notice line: Spanish copy plus the API detail, the way this
	 * panel always did. The cause is captured because the shared state folds it
	 * into one formatted string.
	 */
	async function mutate(
		scope: ProjectNotice['scope'],
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
		scope: ProjectNotice['scope'],
		form: ProjectFormState,
		action: () => Promise<void>,
		successMessage: string,
		failureMessage: string,
	): Promise<boolean> {
		const complaint = validateProjectForm(form);

		if (complaint) {
			setNotice({ scope, kind: 'error', message: complaint });
			return false;
		}

		return mutate(scope, action, successMessage, failureMessage);
	}

	function startEdit(row: AdminProjectRow) {
		setEditingId(row.id);
		setDraftForm(projectToForm(row));
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
				() => createProject(projectFormToBody(current)),
				'Proyecto agregado. La web ya lo muestra.',
				'No pudimos guardar el proyecto. Inténtalo de nuevo en unos minutos.',
			);

			if (created) setNewForm(EMPTY_PROJECT_FORM);
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
				() => updateProject(id, projectFormToBody(current)),
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
				() => deleteProject(id),
				'Proyecto eliminado. La web ya no lo muestra.',
				'No pudimos eliminar el proyecto. Inténtalo de nuevo en unos minutos.',
			);

			if (!removed) return;

			setConfirmingDeleteId(null);
			if (editingId() === id) setEditingId(null);
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<ProjectsEditorView
			status={crud.status()}
			projects={crud.rows()}
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
