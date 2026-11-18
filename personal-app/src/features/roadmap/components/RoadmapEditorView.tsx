import type { AdminPanelFeedback, AdminPanelStatus } from '../../../shared/lib/adminPanel';
import { AdminCreateSection } from '../../../shared/ui/admin/AdminCreateSection';
import { AdminFeedbackBanner } from '../../../shared/ui/admin/AdminFeedbackBanner';
import { AdminListSection } from '../../../shared/ui/admin/AdminListSection';
import { AdminStatusGate } from '../../../shared/ui/admin/AdminStatusGate';
import type { AdminRoadmapMilestoneRow, AdminRoadmapStageRow } from '../api/roadmap-admin';
import type { MilestoneFormState, StageFormState } from '../roadmapForm';
import { RoadmapMilestoneFields } from './RoadmapMilestoneFields';
import { RoadmapMilestoneRowCard } from './RoadmapMilestoneRowCard';
import { RoadmapStageFields } from './RoadmapStageFields';
import { RoadmapStageRowCard } from './RoadmapStageRowCard';

/** Which sub-list a row belongs to; ids are numeric in both tables. */
export type RoadmapRowKind = 'stage' | 'milestone';

export type RoadmapEditorViewProps = {
	status: AdminPanelStatus;
	feedback: AdminPanelFeedback;
	pending: boolean;
	stages: readonly AdminRoadmapStageRow[];
	milestones: readonly AdminRoadmapMilestoneRow[];
	editingStageId: number | null;
	editingMilestoneId: number | null;
	confirmingDeleteStageId: number | null;
	confirmingDeleteMilestoneId: number | null;
	newStageForm: StageFormState;
	newMilestoneForm: MilestoneFormState;
	stageDraft: StageFormState;
	milestoneDraft: MilestoneFormState;
	onRetry: () => void;
	onCreateStageSubmit: (event: SubmitEvent) => void;
	onCreateMilestoneSubmit: (event: SubmitEvent) => void;
	onNewStageInput: <K extends keyof StageFormState>(key: K, value: StageFormState[K]) => void;
	onNewMilestoneInput: <K extends keyof MilestoneFormState>(
		key: K,
		value: MilestoneFormState[K],
	) => void;
	onStageDraftInput: <K extends keyof StageFormState>(key: K, value: StageFormState[K]) => void;
	onMilestoneDraftInput: <K extends keyof MilestoneFormState>(
		key: K,
		value: MilestoneFormState[K],
	) => void;
	onStartEditStage: (row: AdminRoadmapStageRow) => void;
	onStartEditMilestone: (row: AdminRoadmapMilestoneRow) => void;
	onCancelEdit: () => void;
	onSubmitStageEdit: (event: SubmitEvent, id: number) => void;
	onSubmitMilestoneEdit: (event: SubmitEvent, id: number) => void;
	onRequestDelete: (kind: RoadmapRowKind, id: number) => void;
	onConfirmDelete: (kind: RoadmapRowKind, id: number) => void;
	onCancelDelete: () => void;
};

/** Presentational view for the roadmap admin CRUD panel: stages and milestones. */
export function RoadmapEditorView(props: RoadmapEditorViewProps) {
	return (
		<div class="flex flex-col gap-8">
			<AdminStatusGate
				status={props.status}
				loadingText="Cargando la hoja de ruta…"
				errorText="No pudimos cargar la hoja de ruta. Inténtalo de nuevo en unos minutos."
				onRetry={props.onRetry}
			>
				<AdminFeedbackBanner feedback={props.feedback} />

				<AdminCreateSection
					headingId="roadmap-etapa-nueva"
					heading="NUEVA ETAPA"
					submitLabel="Añadir etapa"
					pending={props.pending}
					onSubmit={props.onCreateStageSubmit}
				>
					<RoadmapStageFields form={props.newStageForm} prefix="stage-new" onInput={props.onNewStageInput} />
				</AdminCreateSection>

				<AdminListSection
					headingId="roadmap-etapas"
					heading="ETAPAS GUARDADAS"
					rows={props.stages}
					singularLabel="etapa"
					pluralLabel="etapas"
					orderNote="en orden de posición"
					emptyText="Todavía no hay etapas guardadas: el grafo de la página pública queda vacío. Añade la primera en el formulario de arriba."
				>
					{(row) => (
						<RoadmapStageRowCard
							row={row}
							editing={props.editingStageId === row.id}
							confirmingDelete={props.confirmingDeleteStageId === row.id}
							pending={props.pending}
							form={props.stageDraft}
							onInput={props.onStageDraftInput}
							onStartEdit={() => props.onStartEditStage(row)}
							onCancelEdit={props.onCancelEdit}
							onSubmitEdit={(event) => props.onSubmitStageEdit(event, row.id)}
							onRequestDelete={() => props.onRequestDelete('stage', row.id)}
							onConfirmDelete={() => props.onConfirmDelete('stage', row.id)}
							onCancelDelete={props.onCancelDelete}
						/>
					)}
				</AdminListSection>

				<AdminCreateSection
					headingId="roadmap-hito-nuevo"
					heading="NUEVO HITO"
					submitLabel="Añadir hito"
					pending={props.pending}
					onSubmit={props.onCreateMilestoneSubmit}
				>
					<RoadmapMilestoneFields
						form={props.newMilestoneForm}
						prefix="milestone-new"
						onInput={props.onNewMilestoneInput}
					/>
				</AdminCreateSection>

				<AdminListSection
					headingId="roadmap-hitos"
					heading="HITOS GUARDADOS"
					rows={props.milestones}
					singularLabel="hito"
					pluralLabel="hitos"
					orderNote="en orden de posición"
					emptyText="Todavía no hay hitos guardados: la lista «Próximos hitos» de la página pública queda vacía. Añade el primero en el formulario de arriba."
				>
					{(row) => (
						<RoadmapMilestoneRowCard
							row={row}
							editing={props.editingMilestoneId === row.id}
							confirmingDelete={props.confirmingDeleteMilestoneId === row.id}
							pending={props.pending}
							form={props.milestoneDraft}
							onInput={props.onMilestoneDraftInput}
							onStartEdit={() => props.onStartEditMilestone(row)}
							onCancelEdit={props.onCancelEdit}
							onSubmitEdit={(event) => props.onSubmitMilestoneEdit(event, row.id)}
							onRequestDelete={() => props.onRequestDelete('milestone', row.id)}
							onConfirmDelete={() => props.onConfirmDelete('milestone', row.id)}
							onCancelDelete={props.onCancelDelete}
						/>
					)}
				</AdminListSection>
			</AdminStatusGate>
		</div>
	);
}
