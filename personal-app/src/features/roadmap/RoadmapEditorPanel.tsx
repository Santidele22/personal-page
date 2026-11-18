import { createSignal, onMount } from 'solid-js';
import { createAdminCrudState } from '../../shared/ui/admin/createAdminCrudState';
import {
	createRoadmapMilestone,
	createRoadmapStage,
	deleteRoadmapMilestone,
	deleteRoadmapStage,
	fetchAdminRoadmap,
	updateRoadmapMilestone,
	updateRoadmapStage,
} from './api/roadmap-admin';
import type {
	AdminRoadmapMilestoneRow,
	AdminRoadmapResponse,
	AdminRoadmapStageRow,
} from './api/roadmap-admin';
import {
	EMPTY_MILESTONE_FORM,
	EMPTY_STAGE_FORM,
	milestoneFormToBody,
	milestoneToForm,
	stageFormToBody,
	stageToForm,
	validateMilestoneForm,
	validateStageForm,
} from './roadmapForm';
import type { MilestoneFormState, StageFormState } from './roadmapForm';
import { RoadmapEditorView } from './components/RoadmapEditorView';
import type { RoadmapRowKind } from './components/RoadmapEditorView';

/**
 * Admin CRUD container for the `roadmap` domain (`/admin/roadmap/`): the
 * backend→web3 stages and milestones the public `/roadmap` page renders from the
 * `GET /roadmap` aggregate. One panel hosts both sub-lists (Etapas and Hitos),
 * so one container owns both lists and every handler; the rows keep the API
 * order (`position`, ties by id) because every mutation reloads the aggregate.
 * `createAdminCrudState` owns the fetch state, the mutation lock and the
 * feedback strip; the view is purely presentational. The session gate lives in
 * the admin shell (`AdminTopBar` mounts `SessionGuard`), like the other panels.
 */

/** Which sub-list a row belongs to; ids are numeric in both tables. */
type RowRef = { kind: RoadmapRowKind; id: number };

/** The numeric id of one sub-list inside a row reference, or `null`. */
function refId(ref: RowRef | null, kind: RoadmapRowKind): number | null {
	return ref && ref.kind === kind ? ref.id : null;
}

export default function RoadmapEditorPanel() {
	const crud = createAdminCrudState<AdminRoadmapResponse>({
		// One fetch answers both sub-lists; the shared state keeps the last
		// aggregate so the two lists can never disagree about the stored order.
		fetchRows: async () => [await fetchAdminRoadmap()],
	});

	const [editing, setEditing] = createSignal<RowRef | null>(null);
	const [confirmingDelete, setConfirmingDelete] = createSignal<RowRef | null>(null);
	const [newStageForm, setNewStageForm] = createSignal<StageFormState>(EMPTY_STAGE_FORM);
	const [newMilestoneForm, setNewMilestoneForm] = createSignal<MilestoneFormState>(EMPTY_MILESTONE_FORM);
	const [stageDraft, setStageDraft] = createSignal<StageFormState>(EMPTY_STAGE_FORM);
	const [milestoneDraft, setMilestoneDraft] = createSignal<MilestoneFormState>(EMPTY_MILESTONE_FORM);

	/** The stored aggregate both lists render from. */
	const snapshot = (): AdminRoadmapResponse | undefined => crud.rows()[0];

	onMount(() => {
		void crud.load();
	});

	function updateNewStage<K extends keyof StageFormState>(key: K, value: StageFormState[K]) {
		setNewStageForm((current) => ({ ...current, [key]: value }));
	}

	function updateStageDraft<K extends keyof StageFormState>(key: K, value: StageFormState[K]) {
		setStageDraft((current) => ({ ...current, [key]: value }));
	}

	function updateNewMilestone<K extends keyof MilestoneFormState>(key: K, value: MilestoneFormState[K]) {
		setNewMilestoneForm((current) => ({ ...current, [key]: value }));
	}

	function updateMilestoneDraft<K extends keyof MilestoneFormState>(key: K, value: MilestoneFormState[K]) {
		setMilestoneDraft((current) => ({ ...current, [key]: value }));
	}

	/**
	 * Answers the Spanish validation first, then runs the mutation through the
	 * shared CRUD state, which reloads the aggregate and publishes the success
	 * strip. A refused submit keeps the panel's own copy in that same strip.
	 */
	async function submitValidated(
		problem: string | null,
		action: () => Promise<void>,
		successMessage: string,
	): Promise<boolean> {
		if (problem) {
			crud.setFeedback({ kind: 'error', message: problem });
			return false;
		}

		return crud.mutate(action, successMessage);
	}

	async function handleCreateStage(event: SubmitEvent) {
		event.preventDefault();

		const current = newStageForm();
		const created = await submitValidated(
			validateStageForm(current),
			() => createRoadmapStage(stageFormToBody(current)),
			'Etapa añadida. La web ya muestra el cambio.',
		);

		if (created) setNewStageForm(EMPTY_STAGE_FORM);
	}

	async function handleCreateMilestone(event: SubmitEvent) {
		event.preventDefault();

		const current = newMilestoneForm();
		const created = await submitValidated(
			validateMilestoneForm(current),
			() => createRoadmapMilestone(milestoneFormToBody(current)),
			'Hito añadido. La web ya muestra el cambio.',
		);

		if (created) setNewMilestoneForm(EMPTY_MILESTONE_FORM);
	}

	function startEditStage(row: AdminRoadmapStageRow) {
		setEditing({ kind: 'stage', id: row.id });
		setConfirmingDelete(null);
		setStageDraft(stageToForm(row));
		crud.clearFeedback();
	}

	function startEditMilestone(row: AdminRoadmapMilestoneRow) {
		setEditing({ kind: 'milestone', id: row.id });
		setConfirmingDelete(null);
		setMilestoneDraft(milestoneToForm(row));
		crud.clearFeedback();
	}

	function cancelEdit() {
		setEditing(null);
		crud.clearFeedback();
	}

	async function handleEditStage(event: SubmitEvent, id: number) {
		event.preventDefault();

		const current = stageDraft();
		const saved = await submitValidated(
			validateStageForm(current),
			() => updateRoadmapStage(id, stageFormToBody(current)),
			'Cambios guardados.',
		);

		if (saved) setEditing(null);
	}

	async function handleEditMilestone(event: SubmitEvent, id: number) {
		event.preventDefault();

		const current = milestoneDraft();
		const saved = await submitValidated(
			validateMilestoneForm(current),
			() => updateRoadmapMilestone(id, milestoneFormToBody(current)),
			'Cambios guardados.',
		);

		if (saved) setEditing(null);
	}

	async function handleDelete(kind: RoadmapRowKind, id: number) {
		const removed = await crud.mutate(
			() => (kind === 'stage' ? deleteRoadmapStage(id) : deleteRoadmapMilestone(id)),
			kind === 'stage' ? 'Etapa eliminada.' : 'Hito eliminado.',
		);

		if (!removed) return;

		setConfirmingDelete(null);
		if (refId(editing(), kind) === id) setEditing(null);
	}

	return (
		<RoadmapEditorView
			status={crud.status()}
			feedback={crud.feedback()}
			pending={crud.pending()}
			stages={snapshot()?.stages ?? []}
			milestones={snapshot()?.milestones ?? []}
			editingStageId={refId(editing(), 'stage')}
			editingMilestoneId={refId(editing(), 'milestone')}
			confirmingDeleteStageId={refId(confirmingDelete(), 'stage')}
			confirmingDeleteMilestoneId={refId(confirmingDelete(), 'milestone')}
			newStageForm={newStageForm()}
			newMilestoneForm={newMilestoneForm()}
			stageDraft={stageDraft()}
			milestoneDraft={milestoneDraft()}
			onRetry={() => void crud.load()}
			onCreateStageSubmit={(event) => void handleCreateStage(event)}
			onCreateMilestoneSubmit={(event) => void handleCreateMilestone(event)}
			onNewStageInput={updateNewStage}
			onNewMilestoneInput={updateNewMilestone}
			onStageDraftInput={updateStageDraft}
			onMilestoneDraftInput={updateMilestoneDraft}
			onStartEditStage={startEditStage}
			onStartEditMilestone={startEditMilestone}
			onCancelEdit={cancelEdit}
			onSubmitStageEdit={(event, id) => void handleEditStage(event, id)}
			onSubmitMilestoneEdit={(event, id) => void handleEditMilestone(event, id)}
			onRequestDelete={(kind, id) => setConfirmingDelete({ kind, id })}
			onConfirmDelete={(kind, id) => void handleDelete(kind, id)}
			onCancelDelete={() => setConfirmingDelete(null)}
		/>
	);
}
