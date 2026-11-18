import { createSignal, onMount } from 'solid-js';
import type { ApiBrand } from '../../entities/admin/types';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import type { AdvertisingPlan } from './api/advertising-admin';
import { createBrand, deleteBrand, fetchBrands, fetchBrandPlans, updateBrand } from './api/brands-admin';
import { EMPTY_BRAND_FORM, brandFormToBody, brandToForm, validateBrandForm } from './brandForm';
import type { BrandFormState } from './brandForm';
import { BrandsEditorView } from './components/BrandsEditorView';
import type { BrandFormTarget } from './components/BrandsEditorView';

/**
 * Admin editor for the stored brands: the real sponsors the carousels rotate.
 * Every brand belongs to an advertising plan (the backend rejects deleting a
 * plan still referenced by one), so the form carries a plan selector resolved
 * against the plans collection. The row lists name, plan and validity, using
 * the same active rule as the dashboard adapter (`isBrandActive`). This file is
 * the container: `createAdminCrudState` owns the list, lock and feedback, and
 * `components/` renders. The session gate lives in the admin shell
 * (`AdminTopBar` mounts `SessionGuard`), like the other panels.
 */
export default function BrandsEditorPanel() {
	const [plans, setPlans] = createSignal<AdvertisingPlan[]>([]);

	const crud = createAdminCrudState<ApiBrand>({
		// The plan selector reads the collection the plans panel drives, so every
		// load refreshes both; a failure in either read keeps the panel in error.
		fetchRows: async () => {
			const [brands, storedPlans] = await Promise.all([fetchBrands(), fetchBrandPlans()]);
			setPlans(storedPlans);
			return brands;
		},
	});

	const [creating, setCreating] = createSignal(false);
	const [editingId, setEditingId] = createSignal<number | null>(null);
	const [confirmingDeleteId, setConfirmingDeleteId] = createSignal<number | null>(null);
	const [newForm, setNewForm] = createSignal<BrandFormState>(EMPTY_BRAND_FORM);
	const [draftForm, setDraftForm] = createSignal<BrandFormState>(EMPTY_BRAND_FORM);
	const [saveError, setSaveError] = createSignal('');
	const [validationError, setValidationError] = createSignal<{
		target: BrandFormTarget;
		message: string;
	} | null>(null);

	onMount(() => {
		void crud.load();
	});

	/** Drops the rejected-submit message of one form, or of every form when no target is given. */
	function clearValidationError(target?: BrandFormTarget) {
		setValidationError((current) =>
			current && (target === undefined || current.target === target) ? null : current,
		);
	}

	function updateNew<K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) {
		setNewForm((current) => ({ ...current, [key]: value }));
		clearValidationError('create');
	}

	function updateDraft<K extends keyof BrandFormState>(key: K, value: BrandFormState[K]) {
		setDraftForm((current) => ({ ...current, [key]: value }));

		const id = editingId();
		if (id !== null) clearValidationError(id);
	}

	/**
	 * Validates in Spanish, then runs the mutation through the shared CRUD state.
	 * A refused save is reported inside the form, in the cause's own words; a
	 * saved one keeps this panel's copy instead of the shell's reload note.
	 */
	async function submitValidated(
		target: BrandFormTarget,
		form: BrandFormState,
		action: () => Promise<void>,
		successMessage: string,
	): Promise<boolean> {
		if (crud.pending()) return false;

		const problem = validateBrandForm(form);

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

		if (saved) {
			crud.setFeedback({ kind: 'success', message: successMessage });
			return true;
		}

		crud.clearFeedback();
		setSaveError(cause instanceof Error ? cause.message : 'No pudimos guardar la marca.');
		return false;
	}

	function toggleCreate() {
		setCreating((open) => !open);
		// The card unmounts when it closes, so reopening always starts from a clean form.
		setNewForm(EMPTY_BRAND_FORM);
		clearValidationError('create');
	}

	async function handleCreate(event: SubmitEvent) {
		event.preventDefault();
		const current = newForm();
		const created = await submitValidated(
			'create',
			current,
			() => createBrand(brandFormToBody(current)),
			'Marca añadida. Los carruseles la muestran al recargar.',
		);

		if (!created) return;

		setCreating(false);
		setNewForm(EMPTY_BRAND_FORM);
	}

	function cancelCreate() {
		setCreating(false);
		setNewForm(EMPTY_BRAND_FORM);
		setSaveError('');
		clearValidationError('create');
	}

	function startEdit(brand: ApiBrand) {
		setConfirmingDeleteId(null);
		setDraftForm(brandToForm(brand));
		setEditingId(brand.id);
		setSaveError('');
		clearValidationError();
	}

	function cancelEdit() {
		setEditingId(null);
		setDraftForm(EMPTY_BRAND_FORM);
		setSaveError('');
		clearValidationError();
	}

	async function handleEdit(event: SubmitEvent, id: number) {
		event.preventDefault();
		const current = draftForm();
		const saved = await submitValidated(
			id,
			current,
			() => updateBrand(id, brandFormToBody(current)),
			`Marca #${id} guardada. Los carruseles ya muestran los cambios.`,
		);

		if (!saved) return;

		setEditingId(null);
		setDraftForm(EMPTY_BRAND_FORM);
	}

	async function handleDelete(brand: ApiBrand) {
		let cause: unknown;
		const removed = await crud.mutate(async () => {
			try {
				await deleteBrand(brand.id);
			} catch (error) {
				cause = error;
				throw error;
			}
		}, `Marca #${brand.id} eliminada.`);

		if (removed) {
			setConfirmingDeleteId(null);
			return;
		}

		// The plan relation is `onDelete: 'RESTRICT'`: when the backend refuses,
		// its message is the one that explains why.
		crud.setFeedback({
			kind: 'error',
			message:
				cause instanceof Error && cause.message
					? cause.message
					: 'No pudimos eliminar la marca. Inténtalo de nuevo en unos minutos.',
		});
	}

	return (
		<BrandsEditorView
			status={crud.status()}
			feedback={crud.feedback()}
			brands={crud.rows()}
			plans={plans()}
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
			onConfirmDelete={(brand) => void handleDelete(brand)}
			onCancelDelete={() => setConfirmingDeleteId(null)}
		/>
	);
}
