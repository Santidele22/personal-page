import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createTool,
	deleteTool,
	fetchToolRows,
	updateTool,
} from './api/tools-admin';
import type { ToolRow } from './api/tools-admin';
import { ToolsEditorView } from './components/ToolsEditorView';
import {
	EMPTY_TOOL_FORM,
	toolFormToBody,
	toolToForm,
	validateToolForm,
} from './toolForm';
import type { ToolFormState } from './toolForm';

/**
 * Admin CRUD container for the `tools` domain — the "herramientas que uso"
 * grid the landing renders from `GET /tools` (`/admin/herramientas/`). Manages
 * collection fetch, create, inline edit, and two-step delete through
 * `createAdminCrudState`, so the stored list always matches the API after every
 * mutation, keeping the view purely presentational. Session gating lives in
 * `AdminTopBar`.
 */
export default function ToolsEditorPanel() {
	const crud = createAdminCrudState<ToolRow>({
		fetchRows: fetchToolRows,
	});

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<ToolFormState>(EMPTY_TOOL_FORM);
	const [draftForm, setDraftForm] = createSignal<ToolFormState>(EMPTY_TOOL_FORM);

	onMount(() => {
		void crud.load();
	});

	function updateNew<K extends keyof ToolFormState>(key: K, value: ToolFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
	}

	function updateDraft<K extends keyof ToolFormState>(key: K, value: ToolFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));
	}

	async function submitValidated(
		form: ToolFormState,
		action: () => Promise<void>,
		successMessage: string,
	): Promise<boolean> {
		const problem = validateToolForm(form);
		if (problem) {
			crud.setFeedback({ kind: 'error', message: problem });
			return false;
		}

		return crud.mutate(action, successMessage);
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		const current = newForm();
		const created = await submitValidated(
			current,
			() => createTool(toolFormToBody(current)),
			'Herramienta añadida. La web ya muestra el cambio.',
		);

		if (created) setNewForm(EMPTY_TOOL_FORM);
	}

	function startEdit(row: ToolRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftForm(toolToForm(row));
		crud.clearFeedback();
	}

	function cancelEdit() {
		setEditingId(null);
		setDraftForm(EMPTY_TOOL_FORM);
		crud.clearFeedback();
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();
		const current = draftForm();
		const saved = await submitValidated(
			current,
			() => updateTool(id, toolFormToBody(current)),
			'Cambios guardados.',
		);

		if (saved) setEditingId(null);
	}

	async function handleDelete(id: number) {
		const removed = await crud.mutate(() => deleteTool(id), 'Herramienta eliminada.');

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	return (
		<ToolsEditorView
			status={crud.status()}
			feedback={crud.feedback()}
			rows={crud.rows()}
			pending={crud.pending()}
			newForm={newForm()}
			draftForm={draftForm()}
			editingId={editingId()}
			confirmingDeleteId={confirmingDeleteId()}
			onRetry={() => void crud.load()}
			onCreateSubmit={(event) => void handleCreate(event)}
			onNewInput={updateNew}
			onDraftInput={updateDraft}
			onStartEdit={startEdit}
			onCancelEdit={cancelEdit}
			onSubmitEdit={(event, id) => void handleEdit(event, id)}
			onRequestDelete={(id) => setConfirmingDeleteId(id)}
			onConfirmDelete={(id) => void handleDelete(id)}
			onCancelDelete={() => setConfirmingDeleteId(null)}
		/>
	);
}
