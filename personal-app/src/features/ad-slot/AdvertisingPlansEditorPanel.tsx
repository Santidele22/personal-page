import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createAdvertisingPlan,
	deleteAdvertisingPlan,
	fetchAdvertisingPlans,
	updateAdvertisingPlan,
} from './api/advertising-admin';
import type { AdvertisingPlan } from './api/advertising-admin';
import {
	EMPTY_ADVERTISING_PLAN_FORM,
	advertisingPlanFormToBody,
	advertisingPlanToForm,
	validateAdvertisingPlanForm,
} from './advertisingPlanForm';
import type { AdvertisingPlanFormState } from './advertisingPlanForm';
import { AdvertisingPlansEditorView } from './components/AdvertisingPlansEditorView';
import type { AdvertisingPlanFormTarget } from './components/AdvertisingPlansEditorView';

/**
 * Admin CRUD container for the stored advertising plans. The page keeps its
 * read-only dashboard above; this island owns the writable list through
 * `createAdminCrudState`: every plan can be edited in place or deleted, and the
 * form at the top creates a new one. The editable shape is the commercial pair
 * plus the public slot columns the landing renders (S5, S11). The session gate
 * lives in the admin shell (`AdminTopBar` mounts `SessionGuard`), like the
 * other panels.
 */
export default function AdvertisingPlansEditorPanel() {
	const crud = createAdminCrudState<AdvertisingPlan>({
		fetchRows: fetchAdvertisingPlans,
	});

	const [creating, setCreating] = createSignal(false);
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<AdvertisingPlanFormState>(EMPTY_ADVERTISING_PLAN_FORM);
	const [draftForm, setDraftForm] = createSignal<AdvertisingPlanFormState>(EMPTY_ADVERTISING_PLAN_FORM);
	const [saveError, setSaveError] = createSignal('');
	const [validationError, setValidationError] = createSignal<{
		target: AdvertisingPlanFormTarget;
		message: string;
	} | null>(null);

	onMount(() => {
		void crud.load();
	});

	/** Drops the rejected-submit message of one form, or of every form when no target is given. */
	function clearValidationError(target?: AdvertisingPlanFormTarget) {
		setValidationError((current) =>
			current && (target === undefined || current.target === target) ? null : current,
		);
	}

	function updateNew<K extends keyof AdvertisingPlanFormState>(key: K, value: AdvertisingPlanFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
		clearValidationError('create');
	}

	function updateDraft<K extends keyof AdvertisingPlanFormState>(key: K, value: AdvertisingPlanFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));

		const id = editingId();
		if (id !== null) clearValidationError(id);
	}

	/**
	 * Validates in Spanish, then runs the mutation through the shared CRUD state.
	 * A refused save is reported inside the form, in the cause's own words, the
	 * way this panel always did; the run keeps its pending lock in `crud`.
	 */
	async function submitValidated(
		target: AdvertisingPlanFormTarget,
		form: AdvertisingPlanFormState,
		action: () => Promise<void>,
		successMessage: string,
	): Promise<boolean> {
		if (crud.pending()) return false;

		const problem = validateAdvertisingPlanForm(form);

		if (problem) {
			setValidationError({ target, message: problem });
			return false;
		}

		clearValidationError();
		setSaveError('');

		let cause: unknown;
		const saved = await crud.mutate(async () => {
			try {
				await action();
			} catch (error) {
				cause = error;
				throw error;
			}
		}, successMessage);

		if (saved) return true;

		crud.clearFeedback();
		setSaveError(cause instanceof Error ? cause.message : 'No pudimos guardar el plan.');
		return false;
	}

	function toggleCreate() {
		setCreating((open) => !open);
		// The card unmounts when it closes, so reopening always starts from a clean form.
		setNewForm(EMPTY_ADVERTISING_PLAN_FORM);
		clearValidationError('create');
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		const current = newForm();
		const created = await submitValidated(
			'create',
			current,
			() => createAdvertisingPlan(advertisingPlanFormToBody(current)),
			'Plan añadido. La landing ya muestra el slot al recargar.',
		);

		if (!created) return;

		setCreating(false);
		setNewForm(EMPTY_ADVERTISING_PLAN_FORM);
	}

	function cancelCreate() {
		setCreating(false);
		setNewForm(EMPTY_ADVERTISING_PLAN_FORM);
		setSaveError('');
		clearValidationError('create');
	}

	function startEdit(plan: AdvertisingPlan) {
		setConfirmingDeleteId(null);
		setDraftForm(advertisingPlanToForm(plan));
		setEditingId(plan.id);
		setSaveError('');
		clearValidationError();
	}

	function cancelEdit() {
		setEditingId(null);
		setDraftForm(EMPTY_ADVERTISING_PLAN_FORM);
		setSaveError('');
		clearValidationError();
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();
		const current = draftForm();
		const saved = await submitValidated(
			id,
			current,
			() => updateAdvertisingPlan(id, advertisingPlanFormToBody(current)),
			`Plan #${id} guardado. La landing ya muestra los cambios.`,
		);

		if (!saved) return;

		setEditingId(null);
		setDraftForm(EMPTY_ADVERTISING_PLAN_FORM);
	}

	async function handleDelete(plan: AdvertisingPlan) {
		const removed = await crud.mutate(
			() => deleteAdvertisingPlan(plan.id),
			`Plan #${plan.id} eliminado.`,
		);

		if (removed) {
			setConfirmingDeleteId(null);
			return;
		}

		// This panel answers a failed delete with its own copy, not the backend detail.
		crud.setFeedback({
			kind: 'error',
			message: 'No pudimos eliminar el plan. Inténtalo de nuevo en unos minutos.',
		});
	}

	return (
		<AdvertisingPlansEditorView
			status={crud.status()}
			feedback={crud.feedback()}
			plans={crud.rows()}
			pending={crud.pending()}
			creating={creating()}
			editingId={editingId()}
			confirmingDeleteId={confirmingDeleteId()}
			newForm={newForm()}
			draftForm={draftForm()}
			saveError={saveError()}
			validationError={validationError()}
			onRetry={() => void crud.load()}
			onToggleCreate={toggleCreate}
			onCreateSubmit={(event) => void handleCreate(event)}
			onCancelCreate={cancelCreate}
			onNewInput={updateNew}
			onDraftInput={updateDraft}
			onStartEdit={startEdit}
			onCancelEdit={cancelEdit}
			onSubmitEdit={(event, id) => void handleEdit(event, id)}
			onRequestDelete={(id) => setConfirmingDeleteId(id)}
			onConfirmDelete={(plan) => void handleDelete(plan)}
			onCancelDelete={() => setConfirmingDeleteId(null)}
		/>
	);
}
