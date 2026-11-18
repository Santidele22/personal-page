import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createRecommendation,
	deleteRecommendation,
	fetchAdminRecommendations,
	updateRecommendation,
} from './api/recommendations-admin';
import type { AdminRecommendationRow } from './api/recommendations-admin';
import { RecommendationsEditorView } from './components/RecommendationsEditorView';
import {
	EMPTY_RECOMMENDATION_FORM,
	recommendationFormToBody,
	recommendationToForm,
	validateRecommendationForm,
} from './recommendationForm';
import type { RecommendationFormState } from './recommendationForm';

/**
 * Admin CRUD for the `recommendations` domain (`/admin/recomendaciones/`):
 * the LinkedIn recommendations the home renders from `GET /recommendations`.
 * The island reads, creates, edits, and deletes through the authorized JSON
 * helpers, reloading the stored list after every mutation so row order matches
 * the API (`position`, ties by id). Session gating lives in `AdminTopBar`.
 */
export default function RecommendationsEditorPanel() {
	const crud = createAdminCrudState<AdminRecommendationRow>({
		fetchRows: fetchAdminRecommendations,
	});

	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<RecommendationFormState>(EMPTY_RECOMMENDATION_FORM);
	const [draftForm, setDraftForm] = createSignal<RecommendationFormState>(EMPTY_RECOMMENDATION_FORM);

	onMount(() => {
		void crud.load();
	});

	function updateNew<K extends keyof RecommendationFormState>(key: K, value: RecommendationFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
	}

	function updateDraft<K extends keyof RecommendationFormState>(key: K, value: RecommendationFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));
	}

	async function submitValidated(
		form: RecommendationFormState,
		action: () => Promise<void>,
		successMessage: string,
	): Promise<boolean> {
		const problem = validateRecommendationForm(form);
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
			() => createRecommendation(recommendationFormToBody(current)),
			'Recomendación añadida. La web ya muestra el cambio.',
		);

		if (created) setNewForm(EMPTY_RECOMMENDATION_FORM);
	}

	function startEdit(row: AdminRecommendationRow) {
		setEditingId(row.id);
		setConfirmingDeleteId(null);
		setDraftForm(recommendationToForm(row));
		crud.clearFeedback();
	}

	function cancelEdit() {
		setEditingId(null);
		setDraftForm(EMPTY_RECOMMENDATION_FORM);
		crud.clearFeedback();
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();
		const current = draftForm();
		const saved = await submitValidated(
			current,
			() => updateRecommendation(id, recommendationFormToBody(current)),
			'Cambios guardados.',
		);

		if (saved) setEditingId(null);
	}

	async function handleDelete(id: number) {
		const removed = await crud.mutate(
			() => deleteRecommendation(id),
			'Recomendación eliminada.',
		);

		if (!removed) return;

		setConfirmingDeleteId(null);
		if (editingId() === id) setEditingId(null);
	}

	return (
		<RecommendationsEditorView
			status={crud.status()}
			feedback={crud.feedback()}
			rows={crud.rows()}
			pending={crud.pending()}
			newForm={newForm()}
			draftForm={draftForm()}
			editingId={editingId()}
			confirmingDeleteId={confirmingDeleteId()}
			onRetry={() => void crud.load()}
			onCreateSubmit={handleCreate}
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
